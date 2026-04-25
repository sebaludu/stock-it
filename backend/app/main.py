from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
import app.models  # register all models

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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

from app.routers import auth, users, assets, asset_types, movements, reports
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(assets.router)
app.include_router(asset_types.router)
app.include_router(movements.router)
app.include_router(reports.router)

@app.get("/health")
def health():
    return {"status": "ok"}
