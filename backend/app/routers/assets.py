from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asset import Asset, AssetStatus
from app.models.asset_type import AssetType
from app.models.movement import StockMovement, MovementType
from app.models.asset_deletion_log import AssetDeletionLog
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/assets", tags=["assets"])

def _gen_code(db: Session, asset_type: AssetType) -> str:
    prefix = asset_type.name[:2].upper()
    existing = db.query(Asset).filter(Asset.code.like(f"{prefix}-%")).all()
    numbers = []
    for a in existing:
        parts = a.code.split("-")
        if len(parts) == 2 and parts[1].isdigit():
            numbers.append(int(parts[1]))
    n = max(numbers) + 1 if numbers else 1
    return f"{prefix}-{n:03d}"

@router.get("", response_model=list[AssetResponse])
def list_assets(
    asset_type_id: int | None = None,
    status: AssetStatus | None = None,
    alert_only: bool = False,
    deposit_id: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.models.asset_deposit_stock import AssetDepositStock
    from app.models.user_deposit import UserDeposit
    from app.models.user import UserRole

    q = db.query(Asset).filter(Asset.is_active == True)
    if asset_type_id:
        q = q.filter(Asset.asset_type_id == asset_type_id)
    if status:
        q = q.filter(Asset.status == status)
    if alert_only:
        q = q.filter(Asset.current_stock < Asset.safety_stock)

    if deposit_id:
        q = q.join(AssetDepositStock).filter(
            AssetDepositStock.deposit_id == deposit_id,
            AssetDepositStock.quantity > 0,
        )
    elif current_user.role != UserRole.ADMIN:
        accessible_ids = [ud.deposit_id for ud in db.query(UserDeposit).filter(UserDeposit.user_id == current_user.id).all()]
        if accessible_ids:
            q = q.join(AssetDepositStock, isouter=True).filter(
                (AssetDepositStock.deposit_id.in_(accessible_ids)) | (AssetDepositStock.deposit_id == None)
            )

    return q.distinct().order_by(Asset.code).all()

@router.post("", response_model=AssetResponse)
def create_asset(data: AssetCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    atype = db.query(AssetType).filter(AssetType.id == data.asset_type_id).first()
    if not atype:
        raise HTTPException(404, "Tipo de activo no encontrado")
    code = _gen_code(db, atype)
    asset = Asset(
        code=code,
        asset_type_id=data.asset_type_id,
        description=data.description,
        brand=data.brand,
        model=data.model,
        total_quantity=data.initial_stock,
        current_stock=data.initial_stock,
        safety_stock=data.safety_stock,
        status=data.status,
        purchase_date=data.purchase_date,
        notes=data.notes,
    )
    db.add(asset)
    db.flush()
    if data.initial_stock > 0:
        mv = StockMovement(
            asset_id=asset.id,
            movement_type=MovementType.INGRESO,
            quantity=data.initial_stock,
            reason="Stock inicial",
            operator_user_id=current_user.id,
        )
        db.add(mv)
    db.commit()
    db.refresh(asset)
    return asset

@router.get("/{asset_id}")
def get_asset(asset_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.asset_deposit_stock import AssetDepositStock
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(404, "Activo no encontrado")
    result = AssetResponse.model_validate(asset).model_dump()
    result['deposit_stocks'] = [
        {
            "deposit_id": ads.deposit_id,
            "deposit_name": ads.deposit.name,
            "deposit_location": ads.deposit.location,
            "quantity": ads.quantity,
        }
        for ads in asset.deposit_stocks
        if ads.quantity > 0
    ]
    return result

@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, data: AssetUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(404, "Activo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(asset, k, v)
    asset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(asset)
    return asset

@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    reason: str = "",
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(404, "Activo no encontrado")

    log = AssetDeletionLog(
        asset_code=asset.code,
        asset_description=asset.description,
        asset_type_name=asset.asset_type.name,
        brand=asset.brand,
        model=asset.model,
        total_quantity=asset.total_quantity,
        final_stock=asset.current_stock,
        reason=reason or None,
        deleted_by_user_id=current_user.id,
    )
    db.add(log)
    asset.is_active = False
    db.commit()
    return {"message": "Activo eliminado"}
