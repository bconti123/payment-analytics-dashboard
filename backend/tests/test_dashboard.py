from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models import PaymentMethod, Transaction, TransactionStatus


@pytest.fixture
def dashboard_data(db_session):
    """3 succeeded ($100, $200, $50) + 1 failed ($75) within April 2026."""
    txns = [
        Transaction(
            amount=Decimal("100.00"),
            currency="USD",
            status=TransactionStatus.succeeded,
            payment_method=PaymentMethod.card,
            created_at=datetime(2026, 4, 10, tzinfo=timezone.utc),
        ),
        Transaction(
            amount=Decimal("200.00"),
            currency="USD",
            status=TransactionStatus.succeeded,
            payment_method=PaymentMethod.card,
            created_at=datetime(2026, 4, 12, tzinfo=timezone.utc),
        ),
        Transaction(
            amount=Decimal("50.00"),
            currency="USD",
            status=TransactionStatus.succeeded,
            payment_method=PaymentMethod.wallet,
            created_at=datetime(2026, 4, 12, tzinfo=timezone.utc),
        ),
        Transaction(
            amount=Decimal("75.00"),
            currency="USD",
            status=TransactionStatus.failed,
            payment_method=PaymentMethod.card,
            created_at=datetime(2026, 4, 11, tzinfo=timezone.utc),
        ),
    ]
    db_session.add_all(txns)
    db_session.commit()
    return txns


@pytest.mark.usefixtures("dashboard_data")
def test_summary_arithmetic(client):
    r = client.get("/api/v1/dashboard/summary?start=2026-04-01&end=2026-04-30")
    assert r.status_code == 200
    body = r.json()
    assert body["total_revenue"] == "350.00"
    assert body["transaction_count"] == 4
    assert body["successful_count"] == 3
    assert body["failed_count"] == 1
    # 350 / 3 = 116.6666... -> 116.67
    assert body["average_order_value"] == "116.67"


@pytest.mark.usefixtures("dashboard_data")
def test_revenue_trend_buckets_by_day(client):
    r = client.get(
        "/api/v1/dashboard/revenue-trend"
        "?start=2026-04-10&end=2026-04-12&interval=day"
    )
    assert r.status_code == 200
    body = r.json()
    assert body["interval"] == "day"

    points_by_date = {p["date"]: p for p in body["points"]}
    # Apr 10: $100 / 1 txn
    assert points_by_date["2026-04-10"]["revenue"] == "100.00"
    assert points_by_date["2026-04-10"]["count"] == 1
    # Apr 11: failed only -> excluded from revenue trend (succeeded only)
    assert "2026-04-11" not in points_by_date
    # Apr 12: $200 + $50 = $250 / 2 txns
    assert points_by_date["2026-04-12"]["revenue"] == "250.00"
    assert points_by_date["2026-04-12"]["count"] == 2
