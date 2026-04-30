from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Refund, Transaction, TransactionStatus
from app.schemas.refund import RefundCreate
from app.services import BusinessRuleError, NotFoundError
from app.services.transaction_service import _date_range_to_datetimes


def list_refunds(
    db: Session,
    *,
    start: date | None = None,
    end: date | None = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[Refund], int]:
    start_dt, end_dt = _date_range_to_datetimes(start, end)

    conditions = []
    if start_dt is not None:
        conditions.append(Refund.created_at >= start_dt)
    if end_dt is not None:
        conditions.append(Refund.created_at < end_dt)

    base = select(Refund).where(*conditions)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0

    items = (
        db.scalars(
            base.order_by(Refund.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .all()
    )
    return list(items), total


def create_refund(db: Session, data: RefundCreate) -> Refund:
    txn = db.get(Transaction, data.transaction_id)
    if txn is None:
        raise NotFoundError(f"Transaction {data.transaction_id} not found")

    refunded_so_far: Decimal = db.scalar(
        select(func.coalesce(func.sum(Refund.amount), 0)).where(
            Refund.transaction_id == txn.id
        )
    ) or Decimal("0")

    if refunded_so_far + data.amount > txn.amount:
        raise BusinessRuleError(
            f"Refund amount {data.amount} would exceed transaction amount "
            f"{txn.amount} (already refunded: {refunded_so_far})"
        )

    refund = Refund(**data.model_dump())
    db.add(refund)

    if refunded_so_far + data.amount == txn.amount:
        txn.status = TransactionStatus.refunded

    db.commit()
    db.refresh(refund)
    return refund
