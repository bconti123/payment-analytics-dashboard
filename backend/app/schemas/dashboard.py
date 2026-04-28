from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel

Interval = Literal["day", "week", "month"]


class DateRange(BaseModel):
    start: date
    end: date


class DashboardSummary(BaseModel):
    range: DateRange
    total_revenue: Decimal
    transaction_count: int
    successful_count: int
    failed_count: int
    refund_total: Decimal
    refund_rate: float
    average_order_value: Decimal
    currency: str = "USD"


class TrendPoint(BaseModel):
    date: date
    revenue: Decimal
    count: int


class RevenueTrend(BaseModel):
    interval: Interval
    points: list[TrendPoint]


class RefundTrendPoint(BaseModel):
    date: date
    refund_amount: Decimal
    count: int


class RefundTrend(BaseModel):
    interval: Interval
    points: list[RefundTrendPoint]
