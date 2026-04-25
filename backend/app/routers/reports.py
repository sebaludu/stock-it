import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asset import Asset
from app.models.movement import StockMovement
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

def _stock_status(current: int, safety: int) -> str:
    if current == 0:
        return "CRITICO"
    if current < safety:
        return "BAJO"
    if current == safety:
        return "MINIMO"
    return "OK"

@router.get("/stock")
def stock_report(db: Session = Depends(get_db), _=Depends(get_current_user)):
    assets = db.query(Asset).filter(Asset.is_active == True).all()
    order = {"CRITICO": 0, "BAJO": 1, "MINIMO": 2, "OK": 3}
    result = []
    for a in assets:
        ss = _stock_status(a.current_stock, a.safety_stock)
        pct = round((a.current_stock / a.safety_stock - 1) * 100, 1) if a.safety_stock > 0 else None
        result.append({
            "id": a.id,
            "code": a.code,
            "description": a.description,
            "asset_type": a.asset_type.name,
            "asset_type_icon": a.asset_type.icon,
            "current_stock": a.current_stock,
            "safety_stock": a.safety_stock,
            "total_quantity": a.total_quantity,
            "status": a.status.value,
            "stock_status": ss,
            "stock_diff": a.current_stock - a.safety_stock,
            "stock_pct": pct,
        })
    result.sort(key=lambda x: (order[x["stock_status"]], x["current_stock"]))
    return result

@router.get("/alerts")
def alerts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    assets = db.query(Asset).filter(
        Asset.is_active == True,
        Asset.current_stock < Asset.safety_stock,
    ).all()
    return [
        {"id": a.id, "code": a.code, "description": a.description,
         "asset_type": a.asset_type.name, "current_stock": a.current_stock,
         "safety_stock": a.safety_stock, "stock_status": _stock_status(a.current_stock, a.safety_stock)}
        for a in assets
    ]

@router.get("/movements/export")
def export_movements(db: Session = Depends(get_db), _=Depends(get_current_user)):
    movements = db.query(StockMovement).order_by(StockMovement.timestamp.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Fecha", "Activo", "Código", "Tipo", "Cantidad", "Motivo", "Operador", "Destinatario", "Notas"])
    for m in movements:
        writer.writerow([
            m.id,
            m.timestamp.strftime("%Y-%m-%d %H:%M"),
            m.asset.description,
            m.asset.code,
            m.movement_type.value,
            m.quantity,
            m.reason,
            m.operator.full_name,
            m.target_user.full_name if m.target_user else "",
            m.notes or "",
        ])
    output.seek(0)
    filename = f"movimientos_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        io.BytesIO(output.read().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
