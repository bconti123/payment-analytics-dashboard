import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import PaymentMethod, Transaction, TransactionStatus
from app.schemas.transaction import TransactionCreate
from app.services import NotFoundError


def _date_range_to_datetimes(
    start: date | None, end: date | None
) -> tuple[datetime | None, datetime | None]:
    start_dt = (
        datetime.combine(start, time.min, tzinfo=timezone.utc) if start else None
    )
    end_dt = (
        datetime.combine(end + timedelta(days=1), time.min, tzinfo=timezone.utc)
        if end
        else None
    )
    return start_dt, end_dt


def list_transactions(
    db: Session,
    *,
    status: TransactionStatus | None = None,
    method: PaymentMethod | None = None,
    start: date | None = None,
    end: date | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[Transaction], int]:
    """List transactions with optional filters. Returns (items, total)."""
    start_dt, end_dt = _date_range_to_datetimes(start, end)

    conditions = []
    if status is not None:
        conditions.append(Transaction.status == status)
    if method is not None:
        conditions.append(Transaction.payment_method == method)
    if start_dt is not None:
        conditions.append(Transaction.created_at >= start_dt)
    if end_dt is not None:
        conditions.append(Transaction.created_at < end_dt)

    base = select(Transaction).where(*conditions)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    items = (
        db.scalars(
            base.options(selectinload(Transaction.customer))
            .order_by(Transaction.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .all()
    )
    return list(items), total


def get_transaction(db: Session, transaction_id: uuid.UUID) -> Transaction:
    txn = db.scalar(
        select(Transaction)
        .options(
            selectinload(Transaction.customer),
            selectinload(Transaction.refunds),
        )
        .where(Transaction.id == transaction_id)
    )
    if txn is None:
        raise NotFoundError(f"Transaction {transaction_id} not found")
    return txn


def create_transaction(db: Session, data: TransactionCreate) -> Transaction:
    txn = Transaction(**data.model_dump())
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn
