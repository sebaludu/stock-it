from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.deposit import Deposit
from app.models.asset_deposit_stock import AssetDepositStock
from app.models.deposit_transfer import DepositTransfer
from app.models.user_deposit import UserDeposit
from app.models.asset import Asset
from app.models.user import UserRole
from app.schemas.deposit import DepositCreate, DepositUpdate, DepositResponse, DepositTransferCreate, DepositTransferResponse
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(tags=["deposits"])

def _get_accessible_deposit_ids(user, db: Session) -> list[int] | None:
    if user.role == UserRole.ADMIN:
        return None  # None means all
    return [ud.deposit_id for ud in db.query(UserDeposit).filter(UserDeposit.user_id == user.id).all()]

# ── Deposits CRUD ──────────────────────────────────────────────────────────────

@router.get("/deposits", response_model=list[DepositResponse])
def list_deposits(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    q = db.query(Deposit).filter(Deposit.is_active == True)
    accessible = _get_accessible_deposit_ids(current_user, db)
    if accessible is not None:
        q = q.filter(Deposit.id.in_(accessible))
    return q.order_by(Deposit.name).all()

@router.post("/deposits", response_model=DepositResponse)
def create_deposit(data: DepositCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(Deposit).filter(Deposit.name == data.name).first():
        raise HTTPException(400, "Ya existe un depósito con ese nombre")
    dep = Deposit(**data.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep

@router.put("/deposits/{deposit_id}", response_model=DepositResponse)
def update_deposit(deposit_id: int, data: DepositUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    dep = db.query(Deposit).filter(Deposit.id == deposit_id, Deposit.is_active == True).first()
    if not dep:
        raise HTTPException(404, "Depósito no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(dep, k, v)
    db.commit()
    db.refresh(dep)
    return dep

@router.delete("/deposits/{deposit_id}")
def delete_deposit(deposit_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    dep = db.query(Deposit).filter(Deposit.id == deposit_id, Deposit.is_active == True).first()
    if not dep:
        raise HTTPException(404, "Depósito no encontrado")
    has_stock = db.query(AssetDepositStock).filter(
        AssetDepositStock.deposit_id == deposit_id,
        AssetDepositStock.quantity > 0,
    ).first()
    if has_stock:
        raise HTTPException(400, "No se puede eliminar un depósito que tiene stock activo")
    dep.is_active = False
    db.commit()
    return {"message": "Depósito eliminado"}

# ── Deposit stock per asset ────────────────────────────────────────────────────

@router.get("/deposits/{deposit_id}/stock")
def deposit_stock(deposit_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    accessible = _get_accessible_deposit_ids(current_user, db)
    if accessible is not None and deposit_id not in accessible:
        raise HTTPException(403, "Sin acceso a este depósito")
    dep = db.query(Deposit).filter(Deposit.id == deposit_id, Deposit.is_active == True).first()
    if not dep:
        raise HTTPException(404, "Depósito no encontrado")
    stocks = db.query(AssetDepositStock).filter(
        AssetDepositStock.deposit_id == deposit_id,
        AssetDepositStock.quantity > 0,
    ).all()
    return [
        {
            "asset_id": s.asset_id,
            "asset_code": s.asset.code,
            "asset_description": s.asset.description,
            "asset_type": s.asset.asset_type.name,
            "quantity": s.quantity,
        }
        for s in stocks
    ]

# ── Deposit transfers ──────────────────────────────────────────────────────────

@router.post("/deposit-transfers")
def create_transfer(data: DepositTransferCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if data.from_deposit_id == data.to_deposit_id:
        raise HTTPException(400, "El depósito origen y destino deben ser diferentes")
    if data.quantity <= 0:
        raise HTTPException(400, "La cantidad debe ser mayor a cero")

    asset = db.query(Asset).filter(Asset.id == data.asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(404, "Activo no encontrado")

    from_dep = db.query(Deposit).filter(Deposit.id == data.from_deposit_id, Deposit.is_active == True).first()
    to_dep = db.query(Deposit).filter(Deposit.id == data.to_deposit_id, Deposit.is_active == True).first()
    if not from_dep or not to_dep:
        raise HTTPException(404, "Depósito no encontrado")

    source_stock = db.query(AssetDepositStock).filter_by(
        asset_id=data.asset_id, deposit_id=data.from_deposit_id
    ).first()
    if not source_stock or source_stock.quantity < data.quantity:
        avail = source_stock.quantity if source_stock else 0
        raise HTTPException(400, f"Stock insuficiente en depósito origen. Disponible: {avail}")

    source_stock.quantity -= data.quantity

    dest_stock = db.query(AssetDepositStock).filter_by(
        asset_id=data.asset_id, deposit_id=data.to_deposit_id
    ).first()
    if not dest_stock:
        dest_stock = AssetDepositStock(asset_id=data.asset_id, deposit_id=data.to_deposit_id, quantity=0)
        db.add(dest_stock)
        db.flush()
    dest_stock.quantity += data.quantity

    transfer = DepositTransfer(
        asset_id=data.asset_id,
        from_deposit_id=data.from_deposit_id,
        to_deposit_id=data.to_deposit_id,
        quantity=data.quantity,
        reason=data.reason,
        operator_user_id=current_user.id,
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    return {
        "id": transfer.id,
        "asset_id": transfer.asset_id,
        "asset_code": asset.code,
        "asset_description": asset.description,
        "from_deposit_id": data.from_deposit_id,
        "from_deposit_name": from_dep.name,
        "to_deposit_id": data.to_deposit_id,
        "to_deposit_name": to_dep.name,
        "quantity": data.quantity,
        "reason": data.reason,
        "operator_name": current_user.full_name,
        "timestamp": transfer.timestamp,
    }

@router.get("/deposit-transfers")
def list_transfers(
    asset_id: int | None = None,
    deposit_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(DepositTransfer).order_by(DepositTransfer.timestamp.desc())
    if asset_id:
        q = q.filter(DepositTransfer.asset_id == asset_id)
    if deposit_id:
        q = q.filter(
            (DepositTransfer.from_deposit_id == deposit_id) |
            (DepositTransfer.to_deposit_id == deposit_id)
        )
    transfers = q.limit(200).all()
    return [
        {
            "id": t.id,
            "asset_id": t.asset_id,
            "asset_code": t.asset.code,
            "asset_description": t.asset.description,
            "from_deposit_id": t.from_deposit_id,
            "from_deposit_name": t.from_deposit.name,
            "to_deposit_id": t.to_deposit_id,
            "to_deposit_name": t.to_deposit.name,
            "quantity": t.quantity,
            "reason": t.reason,
            "operator_name": t.operator.full_name,
            "timestamp": t.timestamp,
        }
        for t in transfers
    ]
