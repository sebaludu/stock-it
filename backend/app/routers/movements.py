from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.movement import StockMovement, MovementType
from app.models.asset import Asset, AssetStatus
from app.models.user import User, UserRole
from app.schemas.movement import MovementCreate, MovementResponse
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/movements", tags=["movements"])

@router.get("", response_model=list[MovementResponse])
def list_movements(
    asset_id: int | None = None,
    movement_type: MovementType | None = None,
    target_user_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(StockMovement).order_by(StockMovement.timestamp.desc())
    if asset_id:
        q = q.filter(StockMovement.asset_id == asset_id)
    if movement_type:
        q = q.filter(StockMovement.movement_type == movement_type)
    if target_user_id:
        q = q.filter(StockMovement.target_user_id == target_user_id)
    return q.offset(skip).limit(limit).all()

@router.post("", response_model=MovementResponse)
def create_movement(data: MovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == data.asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(404, "Activo no encontrado")

    if data.movement_type == MovementType.INGRESO and current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Solo el Administrador puede registrar ingresos")

    if data.quantity <= 0:
        raise HTTPException(400, "La cantidad debe ser mayor a cero")

    if data.movement_type == MovementType.EGRESO:
        if asset.current_stock < data.quantity:
            raise HTTPException(400, f"Stock insuficiente. Disponible: {asset.current_stock}")
        if data.target_user_id is None:
            raise HTTPException(400, "Se requiere usuario destinatario para egreso")

    if data.movement_type == MovementType.DEVOLUCION:
        if data.target_user_id is None:
            raise HTTPException(400, "Se requiere el usuario que devuelve el activo")

    if data.movement_type == MovementType.INGRESO:
        asset.current_stock += data.quantity
        asset.total_quantity += data.quantity
    elif data.movement_type == MovementType.EGRESO:
        asset.current_stock -= data.quantity
    elif data.movement_type == MovementType.DEVOLUCION:
        asset.current_stock += data.quantity

    if asset.current_stock == 0:
        asset.status = AssetStatus.ASIGNADO
    else:
        asset.status = AssetStatus.DISPONIBLE
    asset.updated_at = datetime.utcnow()

    mv = StockMovement(
        asset_id=data.asset_id,
        movement_type=data.movement_type,
        quantity=data.quantity,
        reason=data.reason,
        notes=data.notes,
        operator_user_id=current_user.id,
        target_user_id=data.target_user_id,
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return mv

@router.get("/{movement_id}", response_model=MovementResponse)
def get_movement(movement_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    mv = db.query(StockMovement).filter(StockMovement.id == movement_id).first()
    if not mv:
        raise HTTPException(404, "Movimiento no encontrado")
    return mv
