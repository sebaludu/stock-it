from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asset_type import AssetType
from app.schemas.asset_type import AssetTypeCreate, AssetTypeResponse
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/asset-types", tags=["asset-types"])

@router.get("", response_model=list[AssetTypeResponse])
def list_types(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(AssetType).all()

@router.post("", response_model=AssetTypeResponse)
def create_type(data: AssetTypeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(AssetType).filter(AssetType.name == data.name).first():
        raise HTTPException(400, "El tipo ya existe")
    obj = AssetType(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

@router.put("/{type_id}", response_model=AssetTypeResponse)
def update_type(type_id: int, data: AssetTypeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not obj:
        raise HTTPException(404, "Tipo no encontrado")
    for k, v in data.model_dump().items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj

@router.delete("/{type_id}")
def delete_type(type_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not obj:
        raise HTTPException(404, "Tipo no encontrado")
    if obj.assets:
        raise HTTPException(400, "No se puede eliminar un tipo con activos asociados")
    db.delete(obj)
    db.commit()
    return {"message": "Tipo eliminado"}
