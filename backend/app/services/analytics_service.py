from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import Refund, Transaction, TransactionStatus
from app.schemas.dashboard import (
    DashboardSummary,
    DateRange,
    Interval,
    RefundTrend,
    RefundTrendPoint,
    RevenueTrend,
    TrendPoint,
)
from app.services.transaction_service import _date_range_to_datetimes


def summary(db: Session, start: date, end: date) -> DashboardSummary:
    start_dt, end_dt = _date_range_to_datetimes(start, end)

    txn_row = db.execute(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.status == TransactionStatus.succeeded, Transaction.amount),
                        else_=0,
                    )
                ),
                0,
            ).label("revenue"),
            func.count().label("total"),
            func.sum(
                case((Transaction.status == TransactionStatus.succeeded, 1), else_=0)
            ).label("succeeded"),
            func.sum(
                case((Transaction.status == TransactionStatus.failed, 1), else_=0)
            ).label("failed"),
        ).where(Transaction.created_at >= start_dt, Transaction.created_at < end_dt)
    ).one()

    refund_total = db.scalar(
        select(func.coalesce(func.sum(Refund.amount), 0)).where(
            Refund.created_at >= start_dt, Refund.created_at < end_dt
        )
    ) or Decimal("0")

    revenue = Decimal(txn_row.revenue or 0)
    succeeded = int(txn_row.succeeded or 0)
    aov = (revenue / succeeded).quantize(Decimal("0.01")) if succeeded else Decimal("0.00")
    refund_rate = float(refund_total / revenue) if revenue else 0.0

    return DashboardSummary(
        range=DateRange(start=start, end=end),
        total_revenue=revenue,
        transaction_count=int(txn_row.total or 0),
        successful_count=succeeded,
        failed_count=int(txn_row.failed or 0),
        refund_total=refund_total,
        refund_rate=round(refund_rate, 4),
        average_order_value=aov,
        currency="USD",
    )


def revenue_trend(
    db: Session, start: date, end: date, interval: Interval = "day"
) -> RevenueTrend:
    start_dt, end_dt = _date_range_to_datetimes(start, end)
    bucket = func.date_trunc(
        interval, func.timezone("UTC", Transaction.created_at)
    ).label("bucket")

    rows = db.execute(
        select(
            bucket,
            func.coalesce(func.sum(Transaction.amount), 0).label("revenue"),
            func.count().label("count"),
        )
        .where(
            Transaction.created_at >= start_dt,
            Transaction.created_at < end_dt,
            Transaction.status == TransactionStatus.succeeded,
        )
        .group_by(bucket)
        .order_by(bucket)
    ).all()

    points = [
        TrendPoint(
            date=row.bucket.date(),
            revenue=Decimal(row.revenue),
            count=row.count,
        )
        for row in rows
    ]
    return RevenueTrend(interval=interval, points=points)


def refund_trend(
    db: Session, start: date, end: date, interval: Interval = "day"
) -> RefundTrend:
    start_dt, end_dt = _date_range_to_datetimes(start, end)
    bucket = func.date_trunc(
        interval, func.timezone("UTC", Refund.created_at)
    ).label("bucket")

    rows = db.execute(
        select(
            bucket,
            func.coalesce(func.sum(Refund.amount), 0).label("refund_amount"),
            func.count().label("count"),
        )
        .where(Refund.created_at >= start_dt, Refund.created_at < end_dt)
        .group_by(bucket)
        .order_by(bucket)
    ).all()

    points = [
        RefundTrendPoint(
            date=row.bucket.date(),
            refund_amount=Decimal(row.refund_amount),
            count=row.count,
        )
        for row in rows
    ]
    return RefundTrend(interval=interval, points=points)
