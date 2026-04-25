from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
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
