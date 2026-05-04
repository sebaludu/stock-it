from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
import app.models  # register all models

def _add_column(conn, ddl: str):
    try:
        conn.execute(text(ddl))
        conn.commit()
    except Exception:
        conn.rollback()

def _run_migrations():
    with engine.connect() as conn:
        _add_column(conn, "ALTER TABLE assets ADD COLUMN deposit_id INTEGER REFERENCES deposits(id)")
        _add_column(conn, "ALTER TABLE stock_movements ADD COLUMN deposit_id INTEGER REFERENCES deposits(id)")
        _add_column(conn, "ALTER TABLE stock_movements ADD COLUMN target_user_name VARCHAR(255)")
        _add_column(conn, "ALTER TABLE deposits ADD COLUMN environment VARCHAR(20)")
        _add_column(conn, "ALTER TABLE deposits ADD COLUMN alert_email VARCHAR(255)")

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    from seed import seed
    seed()
    yield

app = FastAPI(
    title="Stock IT - GEASA",
    description="Sistema de Control de Activos Informáticos",
    version="1.0.0",
    lifespan=lifespan,
)

from app.core.config import settings

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, users, assets, asset_types, movements, reports, deposits as deposits_router
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(assets.router)
app.include_router(asset_types.router)
app.include_router(movements.router)
app.include_router(reports.router)
app.include_router(deposits_router.router)

@app.get("/health")
def health():
    from app.database import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        return {"status": "ok", "users_in_db": user_count}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
    finally:
        db.close()

@app.post("/admin/reseed")
def reseed():
    from seed import seed
    from app.database import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    try:
        db.query(User).delete()
        db.commit()
    finally:
        db.close()
    seed()
    return {"message": "Seed ejecutado"}
