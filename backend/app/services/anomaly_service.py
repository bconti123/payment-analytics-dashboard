"""Detect daily-revenue anomalies via z-score against a rolling baseline.

For each day in the analysis window we compute a z-score against the
prior `baseline_days` of revenue. Days where |z| exceeds the threshold
are flagged. Days without enough preceding history are skipped silently.

To prevent a near-flat baseline from inflating z (a $2 fluctuation on a
$10K average shouldn't fire), the stddev used in the divisor is floored
at `STDDEV_FLOOR_FRACTION * baseline_mean`.
"""
from __future__ import annotations

import statistics
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.schemas.anomaly import Anomaly, AnomalyReport
from app.schemas.dashboard import DateRange
from app.services import analytics_service

STDDEV_FLOOR_FRACTION = 0.05


def _daily_revenue_series(
    db: Session, start: date, end_inclusive: date
) -> list[Decimal]:
    """Return one entry per day in [start, end_inclusive], 0 for gaps."""
    # revenue_trend's `end` is exclusive, so add a day.
    trend = analytics_service.revenue_trend(
        db, start, end_inclusive + timedelta(days=1), interval="day"
    )
    by_date = {p.date: p.revenue for p in trend.points}
    series: list[Decimal] = []
    cursor = start
    while cursor <= end_inclusive:
        series.append(by_date.get(cursor, Decimal("0")))
        cursor += timedelta(days=1)
    return series


def detect_anomalies(
    db: Session,
    days: int = 30,
    threshold: float = 2.0,
    baseline_days: int = 7,
) -> AnomalyReport:
    if days < 1:
        raise ValueError("days must be >= 1")
    if baseline_days < 2:
        raise ValueError("baseline_days must be >= 2 (need at least 2 points for stddev)")
    if threshold <= 0:
        raise ValueError("threshold must be > 0")

    end_inclusive = date.today()
    window_start = end_inclusive - timedelta(days=days - 1)
    # Pull enough history to have a baseline for the first day in the window.
    series_start = window_start - timedelta(days=baseline_days)
    series = _daily_revenue_series(db, series_start, end_inclusive)

    anomalies: list[Anomaly] = []
    # series[i] is the day at series_start + i. Iterate only over the window
    # portion (the last `days` entries).
    window_offset = baseline_days
    for i in range(window_offset, len(series)):
        day_revenue = series[i]
        baseline = series[i - baseline_days : i]
        baseline_floats = [float(x) for x in baseline]

        mean = statistics.fmean(baseline_floats)
        stddev = statistics.pstdev(baseline_floats)
        # Floor stddev at a fraction of the mean so flat-but-nonzero baselines
        # don't fire on tiny absolute fluctuations. A truly all-zero baseline
        # (mean=0) means we have no signal; skip the day.
        if mean == 0 and stddev == 0:
            continue
        effective_stddev = max(stddev, STDDEV_FLOOR_FRACTION * mean)
        if effective_stddev == 0:
            continue

        z = (float(day_revenue) - mean) / effective_stddev
        if abs(z) < threshold:
            continue

        day = series_start + timedelta(days=i)
        anomalies.append(
            Anomaly(
                date=day,
                revenue=day_revenue,
                baseline_mean=Decimal(mean).quantize(Decimal("0.01")),
                baseline_stddev=Decimal(stddev).quantize(Decimal("0.01")),
                z_score=round(z, 2),
                direction="high" if z > 0 else "low",
            )
        )

    return AnomalyReport(
        window=DateRange(start=window_start, end=end_inclusive),
        threshold=threshold,
        baseline_days=baseline_days,
        anomalies=anomalies,
    )
