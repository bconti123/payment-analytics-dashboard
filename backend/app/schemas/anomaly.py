from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

from app.schemas.dashboard import DateRange

Direction = Literal["high", "low"]


class Anomaly(BaseModel):
    date: date
    revenue: Decimal
    baseline_mean: Decimal
    baseline_stddev: Decimal
    z_score: float
    direction: Direction


class AnomalyReport(BaseModel):
    window: DateRange
    threshold: float
    baseline_days: int
    anomalies: list[Anomaly]
