import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models import PaymentMethod, Transaction, TransactionStatus


@pytest.fixture
def some_transactions(db_session):
    txns = [
        Transaction(
            amount=Decimal("100.00"),
            currency="USD",
            status=TransactionStatus.succeeded,
            payment_method=PaymentMethod.card,
            created_at=datetime(2026, 4, 15, tzinfo=timezone.utc),
        ),
        Transaction(
            amount=Decimal("50.00"),
            currency="USD",
            status=TransactionStatus.failed,
            payment_method=PaymentMethod.card,
            created_at=datetime(2026, 4, 16, tzinfo=timezone.utc),
        ),
        Transaction(
            amount=Decimal("75.00"),
            currency="USD",
            status=TransactionStatus.succeeded,
            payment_method=PaymentMethod.wallet,
            created_at=datetime(2026, 4, 17, tzinfo=timezone.utc),
        ),
    ]
    db_session.add_all(txns)
    db_session.commit()
    return txns


def test_list_transactions_returns_all(client, some_transactions):
    r = client.get("/api/v1/transactions")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 3
    assert len(body["items"]) == 3


def test_list_transactions_filter_by_status(client, some_transactions):
    r = client.get("/api/v1/transactions?status=succeeded")
    body = r.json()
    assert body["total"] == 2
    assert all(item["status"] == "succeeded" for item in body["items"])


def test_list_transactions_pagination(client, some_transactions):
    r = client.get("/api/v1/transactions?page=1&page_size=2")
    body = r.json()
    assert body["page"] == 1
    assert body["page_size"] == 2
    assert body["total"] == 3
    assert len(body["items"]) == 2


def test_get_transaction_existing(client, some_transactions):
    target = some_transactions[0]
    r = client.get(f"/api/v1/transactions/{target.id}")
    assert r.status_code == 200
    assert r.json()["amount"] == "100.00"


def test_get_transaction_missing_returns_404(client):
    r = client.get(f"/api/v1/transactions/{uuid.uuid4()}")
    assert r.status_code == 404


def test_create_transaction(client):
    payload = {
        "amount": "42.50",
        "currency": "USD",
        "status": "succeeded",
        "payment_method": "card",
        "description": "test",
    }
    r = client.post("/api/v1/transactions", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["amount"] == "42.50"
    assert body["status"] == "succeeded"


def test_create_transaction_negative_amount_returns_422(client):
    payload = {
        "amount": "-1.00",
        "currency": "USD",
        "status": "succeeded",
        "payment_method": "card",
    }
    r = client.post("/api/v1/transactions", json=payload)
    assert r.status_code == 422
