import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models import PaymentMethod, TransactionStatus
from app.schemas import Page, TransactionCreate, TransactionOut
from app.services import NotFoundError, transaction_service

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=Page[TransactionOut])
def list_transactions(
    status: TransactionStatus | None = None,
    method: PaymentMethod | None = None,
    start: date | None = None,
    end: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
) -> Page[TransactionOut]:
    items, total = transaction_service.list_transactions(
        db,
        status=status,
        method=method,
        start=start,
        end=end,
        page=page,
        page_size=page_size,
    )
    return Page[TransactionOut](
        page=page,
        page_size=page_size,
        total=total,
        items=[TransactionOut.model_validate(t) for t in items],
    )


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: uuid.UUID, db: Session = Depends(get_db)
) -> TransactionOut:
    try:
        return transaction_service.get_transaction(db, transaction_id)
    except NotFoundError as e:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "",
    response_model=TransactionOut,
    status_code=http_status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def create_transaction(
    payload: TransactionCreate, db: Session = Depends(get_db)
) -> TransactionOut:
    return transaction_service.create_transaction(db, payload)
