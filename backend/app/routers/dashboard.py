from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import DashboardSummary, RefundTrend, RevenueTrend
from app.schemas.dashboard import Interval
from app.services import analytics_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _resolve_range(start: date | None, end: date | None) -> tuple[date, date]:
    if end is None:
        end = date.today()
    if start is None:
        start = end - timedelta(days=30)
    return start, end


@router.get("/summary", response_model=DashboardSummary)
def summary(
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
) -> DashboardSummary:
    start, end = _resolve_range(start, end)
    return analytics_service.summary(db, start, end)


@router.get("/revenue-trend", response_model=RevenueTrend)
def revenue_trend(
    start: date | None = None,
    end: date | None = None,
    interval: Interval = Query("day"),
    db: Session = Depends(get_db),
) -> RevenueTrend:
    start, end = _resolve_range(start, end)
    return analytics_service.revenue_trend(db, start, end, interval)


@router.get("/refund-trend", response_model=RefundTrend)
def refund_trend(
    start: date | None = None,
    end: date | None = None,
    interval: Interval = Query("day"),
    db: Session = Depends(get_db),
) -> RefundTrend:
    start, end = _resolve_range(start, end)
    return analytics_service.refund_trend(db, start, end, interval)
