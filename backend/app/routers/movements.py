from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.movement import StockMovement, MovementType
from app.models.asset import Asset, AssetStatus
from app.models.asset_deposit_stock import AssetDepositStock
from app.models.user import User, UserRole
from app.models.deposit import Deposit
from app.schemas.movement import MovementCreate, MovementResponse
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/movements", tags=["movements"])

def _get_or_create_deposit_stock(db, asset_id, deposit_id):
    ads = db.query(AssetDepositStock).filter_by(asset_id=asset_id, deposit_id=deposit_id).first()
    if not ads:
        ads = AssetDepositStock(asset_id=asset_id, deposit_id=deposit_id, quantity=0)
        db.add(ads)
        db.flush()
    return ads

def _stock_status(current, safety):
    if current == 0:
        return "CRITICO"
    if current < safety:
        return "BAJO"
    if current == safety:
        return "MINIMO"
    return "OK"

def _serialize_movement(m):
    return {
        "id": m.id,
        "asset_id": m.asset_id,
        "asset": {
            "id": m.asset.id,
            "code": m.asset.code,
            "description": m.asset.description,
            "asset_type_id": m.asset.asset_type_id,
            "asset_type": {
                "id": m.asset.asset_type.id,
                "name": m.asset.asset_type.name,
                "icon": m.asset.asset_type.icon,
                "description": m.asset.asset_type.description,
                "created_at": m.asset.asset_type.created_at,
            },
            "brand": m.asset.brand,
            "model": m.asset.model,
            "total_quantity": m.asset.total_quantity,
            "current_stock": m.asset.current_stock,
            "safety_stock": m.asset.safety_stock,
            "status": m.asset.status.value,
            "stock_status": _stock_status(m.asset.current_stock, m.asset.safety_stock),
            "purchase_date": m.asset.purchase_date,
            "notes": m.asset.notes,
            "is_active": m.asset.is_active,
            "created_at": m.asset.created_at,
            "updated_at": m.asset.updated_at,
            "deposit_stocks": [],
        },
        "movement_type": m.movement_type.value,
        "quantity": m.quantity,
        "reason": m.reason,
        "notes": m.notes,
        "operator_user_id": m.operator_user_id,
        "operator": {
            "id": m.operator.id,
            "username": m.operator.username,
            "full_name": m.operator.full_name,
            "email": m.operator.email,
            "role": m.operator.role.value,
            "is_active": m.operator.is_active,
            "created_at": m.operator.created_at,
        },
        "target_user_id": m.target_user_id,
        "target_user": {
            "id": m.target_user.id,
            "username": m.target_user.username,
            "full_name": m.target_user.full_name,
            "email": m.target_user.email,
            "role": m.target_user.role.value,
            "is_active": m.target_user.is_active,
            "created_at": m.target_user.created_at,
        } if m.target_user else None,
        "deposit_id": m.deposit_id,
        "deposit_name": m.deposit.name if m.deposit else None,
        "timestamp": m.timestamp,
    }

@router.get("")
def list_movements(
    asset_id: int | None = None,
    movement_type: MovementType | None = None,
    target_user_id: int | None = None,
    deposit_id: int | None = None,
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
    if deposit_id:
        q = q.filter(StockMovement.deposit_id == deposit_id)
    return [_serialize_movement(m) for m in q.offset(skip).limit(limit).all()]

@router.post("")
def create_movement(data: MovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == data.asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(404, "Activo no encontrado")

    if data.movement_type == MovementType.INGRESO and current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Solo el Administrador puede registrar ingresos")

    if data.quantity <= 0:
        raise HTTPException(400, "La cantidad debe ser mayor a cero")

    if data.deposit_id:
        deposit = db.query(Deposit).filter(Deposit.id == data.deposit_id, Deposit.is_active == True).first()
        if not deposit:
            raise HTTPException(404, "Depósito no encontrado")

    if data.movement_type == MovementType.EGRESO:
        if asset.current_stock < data.quantity:
            raise HTTPException(400, f"Stock insuficiente. Disponible: {asset.current_stock}")
        if data.target_user_id is None:
            raise HTTPException(400, "Se requiere usuario destinatario para egreso")

    if data.movement_type == MovementType.DEVOLUCION and data.target_user_id is None:
        raise HTTPException(400, "Se requiere el usuario que devuelve el activo")

    # Update asset totals
    if data.movement_type == MovementType.INGRESO:
        asset.current_stock += data.quantity
        asset.total_quantity += data.quantity
    elif data.movement_type == MovementType.EGRESO:
        asset.current_stock -= data.quantity
    else:
        asset.current_stock += data.quantity

    # Update deposit stock
    if data.deposit_id:
        ads = _get_or_create_deposit_stock(db, data.asset_id, data.deposit_id)
        if data.movement_type == MovementType.INGRESO:
            ads.quantity += data.quantity
        elif data.movement_type == MovementType.EGRESO:
            ads.quantity -= data.quantity
        else:
            ads.quantity += data.quantity

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
        deposit_id=data.deposit_id,
    )
    db.add(mv)
    db.commit()
    db.refresh(mv)
    return _serialize_movement(mv)

@router.get("/{movement_id}")
def get_movement(movement_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    mv = db.query(StockMovement).filter(StockMovement.id == movement_id).first()
    if not mv:
        raise HTTPException(404, "Movimiento no encontrado")
    return _serialize_movement(mv)
