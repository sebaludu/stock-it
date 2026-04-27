from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.user_deposit import UserDeposit
from app.models.deposit import Deposit
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.core.dependencies import get_current_user, require_admin
from app.core.security import get_password_hash

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).all()

@router.post("", response_model=UserResponse)
def create_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "El nombre de usuario ya existe")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "El email ya existe")
    user = User(
        username=data.username,
        full_name=data.full_name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.models.user import UserRole
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(403, "Sin permisos")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    update = data.model_dump(exclude_unset=True)
    if "password" in update:
        update["hashed_password"] = get_password_hash(update.pop("password"))
    for k, v in update.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if current_user.id == user_id:
        raise HTTPException(400, "No puedes desactivarte a ti mismo")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user.is_active = False
    db.commit()
    return {"message": "Usuario desactivado"}

@router.get("/{user_id}/deposits")
def get_user_deposits(user_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.models.user import UserRole
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(403, "Sin permisos")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    return [
        {"id": ud.deposit.id, "name": ud.deposit.name, "location": ud.deposit.location}
        for ud in user.user_deposits
        if ud.deposit.is_active
    ]

@router.post("/{user_id}/deposits")
def add_user_deposit(user_id: int, payload: dict, db: Session = Depends(get_db), _=Depends(require_admin)):
    deposit_id = payload.get("deposit_id")
    if not deposit_id:
        raise HTTPException(400, "deposit_id requerido")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    dep = db.query(Deposit).filter(Deposit.id == deposit_id, Deposit.is_active == True).first()
    if not dep:
        raise HTTPException(404, "Depósito no encontrado")
    existing = db.query(UserDeposit).filter_by(user_id=user_id, deposit_id=deposit_id).first()
    if existing:
        raise HTTPException(400, "El usuario ya tiene acceso a este depósito")
    ud = UserDeposit(user_id=user_id, deposit_id=deposit_id)
    db.add(ud)
    db.commit()
    return {"message": "Depósito asignado"}

@router.delete("/{user_id}/deposits/{deposit_id}")
def remove_user_deposit(user_id: int, deposit_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    ud = db.query(UserDeposit).filter_by(user_id=user_id, deposit_id=deposit_id).first()
    if not ud:
        raise HTTPException(404, "Asignación no encontrada")
    db.delete(ud)
    db.commit()
    return {"message": "Depósito removido del usuario"}
