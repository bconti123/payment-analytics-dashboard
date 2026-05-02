from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import WeeklyInsight
from app.services import insights_service

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/weekly", response_model=WeeklyInsight)
def weekly(
    week_ending: date | None = Query(
        None,
        description="ISO date for the last day of the week (defaults to most recent Sunday).",
    ),
    refresh: bool = Query(False, description="Bypass the in-memory cache."),
    db: Session = Depends(get_db),
) -> WeeklyInsight:
    try:
        return insights_service.generate_weekly_insight(
            db, week_ending=week_ending, refresh=refresh
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
