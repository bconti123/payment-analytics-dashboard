from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.core.config import settings
from app.models import PaymentMethod, Transaction, TransactionStatus
from app.services import insights_service


@pytest.fixture
def two_weeks_of_data(db_session):
    """One succeeded txn each in week ending Sun 2026-04-26 and the prior week."""
    txns = [
        Transaction(
            amount=Decimal("100.00"),
            currency="USD",
            status=TransactionStatus.succeeded,
            payment_method=PaymentMethod.card,
            created_at=datetime(2026, 4, 22, 12, tzinfo=timezone.utc),  # current week
        ),
        Transaction(
            amount=Decimal("80.00"),
            currency="USD",
            status=TransactionStatus.succeeded,
            payment_method=PaymentMethod.card,
            created_at=datetime(2026, 4, 15, 12, tzinfo=timezone.utc),  # prior week
        ),
    ]
    db_session.add_all(txns)
    db_session.commit()
    return txns


def _fake_response(text: str = "Revenue rose 25% week-over-week."):
    return SimpleNamespace(
        content=[SimpleNamespace(type="text", text=text)],
        model="claude-haiku-4-5",
    )


@pytest.mark.usefixtures("two_weeks_of_data")
def test_weekly_happy_path_calls_claude_with_both_summaries(client, monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-test")
    insights_service._cache.clear()
    insights_service._client = None

    captured = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return _fake_response()

    with patch("anthropic.Anthropic") as mock_cls:
        mock_cls.return_value.messages.create = fake_create

        r = client.get("/api/v1/insights/weekly?week_ending=2026-04-26")

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["week_start"] == "2026-04-20"
    assert body["week_end"] == "2026-04-26"
    assert body["narrative"] == "Revenue rose 25% week-over-week."
    assert body["summary"]["total_revenue"] == "100.00"
    assert body["previous_summary"]["total_revenue"] == "80.00"
    assert body["cached"] is False
    assert body["model"] == "claude-haiku-4-5"

    assert captured["model"] == "claude-haiku-4-5"
    assert captured["cache_control"] == {"type": "ephemeral"}
    assert "thinking" not in captured  # Haiku 4.5 doesn't support effort/adaptive
    user_msg = captured["messages"][0]["content"]
    assert "$100.00" in user_msg
    assert "$80.00" in user_msg


@pytest.mark.usefixtures("two_weeks_of_data")
def test_weekly_uses_cache_on_second_call(client, monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-test")
    insights_service._cache.clear()
    insights_service._client = None

    call_count = 0

    def fake_create(**kwargs):
        nonlocal call_count
        call_count += 1
        return _fake_response()

    with patch("anthropic.Anthropic") as mock_cls:
        mock_cls.return_value.messages.create = fake_create

        first = client.get("/api/v1/insights/weekly?week_ending=2026-04-26")
        second = client.get("/api/v1/insights/weekly?week_ending=2026-04-26")
        third = client.get("/api/v1/insights/weekly?week_ending=2026-04-26&refresh=true")

    assert first.status_code == second.status_code == third.status_code == 200
    assert call_count == 2  # second was cached, third refreshed
    assert first.json()["cached"] is False
    assert second.json()["cached"] is True
    assert third.json()["cached"] is False


def test_weekly_returns_503_without_api_key(client, monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", None)
    insights_service._cache.clear()

    r = client.get("/api/v1/insights/weekly?week_ending=2026-04-26")

    assert r.status_code == 503
    assert "ANTHROPIC_API_KEY" in r.json()["detail"]


def test_most_recent_sunday_handles_each_weekday():
    # Sun 2026-04-26 -> Sun 2026-04-26 (no shift)
    assert insights_service._most_recent_sunday(date(2026, 4, 26)) == date(2026, 4, 26)
    # Mon 2026-04-27 -> Sun 2026-04-26
    assert insights_service._most_recent_sunday(date(2026, 4, 27)) == date(2026, 4, 26)
    # Sat 2026-04-25 -> Sun 2026-04-19
    assert insights_service._most_recent_sunday(date(2026, 4, 25)) == date(2026, 4, 19)
