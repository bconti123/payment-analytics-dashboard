from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import AnomalyReport, DashboardSummary, RefundTrend, RevenueTrend
from app.schemas.dashboard import Interval
from app.services import analytics_service, anomaly_service

# Public reads — no auth required so the deployed dashboard is open for demo.
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


@router.get("/anomalies", response_model=AnomalyReport)
def anomalies(
    days: int = Query(30, ge=1, le=365),
    threshold: float = Query(2.0, gt=0, le=10.0),
    baseline: int = Query(7, ge=2, le=90),
    db: Session = Depends(get_db),
) -> AnomalyReport:
    try:
        return anomaly_service.detect_anomalies(
            db, days=days, threshold=threshold, baseline_days=baseline
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
