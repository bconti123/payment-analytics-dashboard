from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.dashboard import DashboardSummary


class WeeklyInsight(BaseModel):
    week_start: date
    week_end: date
    narrative: str
    summary: DashboardSummary
    previous_summary: DashboardSummary
    model: str
    generated_at: datetime
    cached: bool
