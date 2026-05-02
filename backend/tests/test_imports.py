from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import select

from app.models import Customer, PaymentMethod, Transaction, TransactionStatus

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_csv() -> bytes:
    return (FIXTURES / "sample_stripe_export.csv").read_bytes()


def _post_csv(client, content: bytes, filename: str = "stripe.csv"):
    return client.post(
        "/api/v1/imports/csv",
        files={"file": (filename, content, "text/csv")},
    )


def test_happy_path_imports_three_rows(client, db_session, sample_csv):
    r = _post_csv(client, sample_csv)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body == {"imported": 3, "skipped": 0, "failed": 0, "errors": []}

    txns = db_session.scalars(select(Transaction).order_by(Transaction.created_at)).all()
    assert len(txns) == 3
    assert txns[0].external_id == "pi_001"
    assert txns[0].amount == Decimal("125.00")  # 12500 cents -> $125.00
    assert txns[0].status == TransactionStatus.succeeded
    assert txns[0].payment_method == PaymentMethod.card
    assert txns[1].external_id == "pi_002"
    assert txns[2].status == TransactionStatus.failed

    # Customers were upserted by email
    customers = db_session.scalars(select(Customer).order_by(Customer.email)).all()
    assert [c.email for c in customers] == ["alice@example.com", "bob@example.com", "carol@example.com"]


def test_reimport_same_file_is_idempotent(client, sample_csv):
    first = _post_csv(client, sample_csv).json()
    second = _post_csv(client, sample_csv).json()
    assert first == {"imported": 3, "skipped": 0, "failed": 0, "errors": []}
    assert second == {"imported": 0, "skipped": 3, "failed": 0, "errors": []}


def test_mixed_errors_are_collected_per_row(client, db_session):
    csv = (
        b"id,created,amount,currency,status,payment_method,customer_email,description\n"
        b"pi_good,2026-04-15T10:00:00Z,5000,USD,succeeded,card,a@example.com,ok\n"
        b"pi_bad_status,2026-04-15T10:00:00Z,5000,USD,WHAT,card,b@example.com,\n"
        b"pi_bad_amount,2026-04-15T10:00:00Z,not-a-number,USD,succeeded,card,c@example.com,\n"
    )
    r = _post_csv(client, csv)
    assert r.status_code == 200
    body = r.json()
    assert body["imported"] == 1
    assert body["skipped"] == 0
    assert body["failed"] == 2
    assert {e["row"] for e in body["errors"]} == {3, 4}
    # Spreadsheet-style row numbers: header is row 1, first data row is row 2
    assert any("status" in e["message"] for e in body["errors"])
    assert any("amount" in e["message"] for e in body["errors"])

    # The good row landed
    assert db_session.scalar(
        select(Transaction).where(Transaction.external_id == "pi_good")
    ) is not None


def test_missing_required_column_returns_400(client):
    csv = b"id,created,amount\npi_001,2026-04-15T10:00:00Z,5000\n"
    r = _post_csv(client, csv)
    assert r.status_code == 400
    assert "missing required columns" in r.json()["detail"]


def test_empty_file_returns_400(client):
    r = _post_csv(client, b"")
    assert r.status_code == 400
    assert "empty" in r.json()["detail"]
