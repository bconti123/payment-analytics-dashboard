import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models import PaymentMethod, Transaction, TransactionStatus


@pytest.fixture
def succeeded_txn(db_session):
    txn = Transaction(
        amount=Decimal("100.00"),
        currency="USD",
        status=TransactionStatus.succeeded,
        payment_method=PaymentMethod.card,
        created_at=datetime(2026, 4, 15, tzinfo=timezone.utc),
    )
    db_session.add(txn)
    db_session.commit()
    db_session.refresh(txn)
    return txn


def test_create_full_refund_flips_parent_status(client, db_session, succeeded_txn):
    r = client.post(
        "/api/v1/refunds",
        json={"transaction_id": str(succeeded_txn.id), "amount": "100.00"},
    )
    assert r.status_code == 201

    db_session.refresh(succeeded_txn)
    assert succeeded_txn.status == TransactionStatus.refunded


def test_overrefund_returns_422(client, succeeded_txn):
    r = client.post(
        "/api/v1/refunds",
        json={"transaction_id": str(succeeded_txn.id), "amount": "200.00"},
    )
    assert r.status_code == 422
    assert "exceed" in r.json()["detail"]


def test_refund_missing_transaction_returns_404(client):
    r = client.post(
        "/api/v1/refunds",
        json={"transaction_id": str(uuid.uuid4()), "amount": "1.00"},
    )
    assert r.status_code == 404
