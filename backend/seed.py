from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.asset_type import AssetType
from app.models.asset import Asset, AssetStatus
from app.models.movement import StockMovement, MovementType
from app.models.deposit import Deposit
from app.models.asset_deposit_stock import AssetDepositStock
from app.models.user_deposit import UserDeposit
from app.core.security import get_password_hash

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).first():
            return  # already seeded

        admin = User(username="admin", full_name="Administrador GEASA",
                     email="admin@geasa.com.ar", hashed_password=get_password_hash("Admin123!"),
                     role=UserRole.ADMIN)
        soporte = User(username="soporte", full_name="Soporte IT",
                       email="soporte@geasa.com.ar", hashed_password=get_password_hash("Soporte123!"),
                       role=UserRole.SOPORTE_IT)
        db.add_all([admin, soporte])
        db.flush()

        types_data = [
            ("Notebook", "Computadoras portátiles", "💻"),
            ("Monitor", "Monitores y pantallas", "🖥️"),
            ("Teclado", "Teclados", "⌨️"),
            ("Mouse", "Ratones", "🖱️"),
            ("Celular", "Teléfonos móviles", "📱"),
            ("PC", "Computadoras de escritorio", "🖥️"),
            ("Headset", "Auriculares con micrófono", "🎧"),
            ("Cable", "Cables y conectores", "🔌"),
        ]
        types = {}
        for name, desc, icon in types_data:
            t = AssetType(name=name, description=desc, icon=icon)
            db.add(t)
            types[name] = t
        db.flush()

        deposits = [
            Deposit(name="Depósito Central", description="Depósito principal", location="Planta Baja - Sector A"),
            Deposit(name="Depósito Sucursal Norte", description="Sucursal zona norte", location="Edificio Norte - Piso 1"),
            Deposit(name="Depósito Reparación", description="Equipos en reparación o servicio técnico", location="Sala de Servidores"),
        ]
        for d in deposits:
            db.add(d)
        db.flush()

        dep_central = db.query(Deposit).filter(Deposit.name == "Depósito Central").first()

        assets_data = [
            ("NO-001", "Notebook", "Notebook Dell Latitude 5420", "Dell", "Latitude 5420", 10, 3, 5, AssetStatus.DISPONIBLE),
            ("MO-001", "Monitor", "Monitor LG 24\"", "LG", "24MK430H", 15, 8, 3, AssetStatus.DISPONIBLE),
            ("TE-001", "Teclado", "Teclado HP USB K1500", "HP", "K1500", 20, 3, 3, AssetStatus.DISPONIBLE),
            ("CE-001", "Celular", "Samsung Galaxy A54", "Samsung", "Galaxy A54", 5, 0, 2, AssetStatus.ASIGNADO),
            ("MO-002", "Mouse", "Mouse Logitech M90", "Logitech", "M90", 25, 12, 5, AssetStatus.DISPONIBLE),
            ("HE-001", "Headset", "Headset Jabra Evolve", "Jabra", "Evolve 20", 8, 1, 3, AssetStatus.DISPONIBLE),
        ]
        for code, type_name, desc, brand, model, total, current, safety, status in assets_data:
            a = Asset(code=code, asset_type_id=types[type_name].id, description=desc,
                      brand=brand, model=model, total_quantity=total,
                      current_stock=current, safety_stock=safety, status=status,
                      deposit_id=dep_central.id)
            db.add(a)
        db.flush()

        all_assets = db.query(Asset).all()
        for a in all_assets:
            mv = StockMovement(asset_id=a.id, movement_type=MovementType.INGRESO,
                               quantity=a.total_quantity, reason="Stock inicial",
                               operator_user_id=admin.id, deposit_id=dep_central.id)
            db.add(mv)
            if a.current_stock > 0:
                db.add(AssetDepositStock(asset_id=a.id, deposit_id=dep_central.id, quantity=a.current_stock))

        db.commit()
        print("Datos iniciales creados")
    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
