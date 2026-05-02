"""Tests for the anomaly detection endpoint.

`detect_anomalies()` looks at "today" (`date.today()`) so we seed
transactions relative to today rather than to fixed calendar dates.
"""
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

import pytest

from app.models import PaymentMethod, Transaction, TransactionStatus


def _txn(amount: str, on: date) -> Transaction:
    # Time-of-day at noon UTC keeps everything in the same day regardless
    # of the test runner's local timezone.
    return Transaction(
        amount=Decimal(amount),
        currency="USD",
        status=TransactionStatus.succeeded,
        payment_method=PaymentMethod.card,
        created_at=datetime.combine(on, time(12, 0), tzinfo=timezone.utc),
    )


@pytest.fixture
def flat_then_spike(db_session):
    """20 days of $1000/day, then a $10000 spike on day 21 (yesterday)."""
    today = date.today()
    txns = []
    for offset in range(21, 1, -1):  # day -21 through day -2
        txns.append(_txn("1000.00", today - timedelta(days=offset)))
    txns.append(_txn("10000.00", today - timedelta(days=1)))  # the spike
    db_session.add_all(txns)
    db_session.commit()


@pytest.fixture
def flat_baseline(db_session):
    """22 days of identical $1000/day revenue including today, no spike."""
    today = date.today()
    txns = [_txn("1000.00", today - timedelta(days=offset)) for offset in range(22)]
    db_session.add_all(txns)
    db_session.commit()


@pytest.mark.usefixtures("flat_then_spike")
def test_spike_is_detected_as_high_anomaly(client):
    r = client.get("/api/v1/dashboard/anomalies?days=10&threshold=2.0&baseline=7")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["threshold"] == 2.0
    assert body["baseline_days"] == 7
    spike_date = (date.today() - timedelta(days=1)).isoformat()
    spike = next(a for a in body["anomalies"] if a["date"] == spike_date)
    assert spike["direction"] == "high"
    assert spike["z_score"] >= 2.0
    assert spike["revenue"] == "10000.00"
    assert spike["baseline_mean"] == "1000.00"


@pytest.mark.usefixtures("flat_baseline")
def test_flat_data_produces_no_anomalies(client):
    r = client.get("/api/v1/dashboard/anomalies?days=10&threshold=2.0&baseline=7")
    assert r.status_code == 200
    body = r.json()
    assert body["anomalies"] == []


def test_empty_database_returns_empty_report(client):
    r = client.get("/api/v1/dashboard/anomalies")
    assert r.status_code == 200
    body = r.json()
    # All-zero revenue → mean=0, stddev=0, every day is skipped silently.
    assert body["anomalies"] == []


@pytest.mark.usefixtures("flat_then_spike")
def test_zero_revenue_day_after_steady_revenue_is_low_anomaly(client, db_session):
    # Drop the spike fixture's spike row, leave 20 days of $1000 ending
    # day -2; today and yesterday will both be 0 revenue.
    today = date.today()
    db_session.query(Transaction).filter(
        Transaction.created_at
        >= datetime.combine(today - timedelta(days=1), time(0), tzinfo=timezone.utc)
    ).delete(synchronize_session=False)
    db_session.commit()

    r = client.get("/api/v1/dashboard/anomalies?days=5&threshold=2.0&baseline=7")
    assert r.status_code == 200
    # Days that fall to $0 after a $1000 baseline should fire as 'low'.
    lows = [a for a in r.json()["anomalies"] if a["direction"] == "low"]
    assert lows, "expected at least one low-direction anomaly for the zero-revenue days"


def test_invalid_threshold_returns_422(client):
    r = client.get("/api/v1/dashboard/anomalies?threshold=0")
    assert r.status_code == 422  # FastAPI Query validation, not the service raise


def test_invalid_baseline_returns_422(client):
    r = client.get("/api/v1/dashboard/anomalies?baseline=1")
    assert r.status_code == 422
