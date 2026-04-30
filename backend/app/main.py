from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.routers import dashboard, refunds, transactions

app = FastAPI(title=settings.app_name)

API_PREFIX = "/api/v1"

app.include_router(transactions.router, prefix=API_PREFIX)
app.include_router(refunds.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
