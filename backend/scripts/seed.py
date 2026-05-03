"""Seed the local payment_analytics DB with fake data.

Usage (from backend/):
    python -m scripts.seed             # seed an empty DB
    python -m scripts.seed --reset     # wipe and re-seed
"""
import argparse
import random
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from faker import Faker
from sqlalchemy import text

from app.core.database import SessionLocal
from app.models import (
    Customer,
    PaymentMethod,
    Refund,
    Transaction,
    TransactionStatus,
    UserRole,
)
from app.services.auth_service import ensure_user

DEV_USERS = [
    ("admin@example.com", "devpassword", UserRole.admin),
    ("viewer@example.com", "devpassword", UserRole.viewer),
]

NUM_CUSTOMERS = 50
NUM_TRANSACTIONS = 500
DAYS = 60

STATUS_WEIGHTS = {
    TransactionStatus.succeeded: 85,
    TransactionStatus.failed: 5,
    TransactionStatus.pending: 3,
    TransactionStatus.refunded: 7,
}

METHOD_WEIGHTS = {
    PaymentMethod.card: 70,
    PaymentMethod.bank_transfer: 20,
    PaymentMethod.wallet: 10,
}

REFUND_REASONS = [
    "customer request",
    "duplicate charge",
    "fraud",
    "wrong item",
    None,
]


def weighted_choice(weights: dict):
    return random.choices(list(weights.keys()), weights=list(weights.values()), k=1)[0]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reset", action="store_true", help="Truncate all tables before seeding."
    )
    args = parser.parse_args()

    fake = Faker()
    Faker.seed(42)
    random.seed(42)

    db = SessionLocal()
    try:
        existing = db.execute(text("SELECT COUNT(*) FROM transactions")).scalar()
        if existing and not args.reset:
            print(
                f"DB already has {existing} transactions. "
                "Re-run with --reset to wipe and reseed."
            )
            return

        if args.reset and existing:
            print("Wiping existing data...")
            db.execute(
                text("TRUNCATE refunds, transactions, customers, users RESTART IDENTITY CASCADE")
            )
            db.commit()

        print("Seeding dev users...")
        created_users = []
        for email, password, role in DEV_USERS:
            _, created = ensure_user(db, email=email, password=password, role=role)
            if created:
                created_users.append((email, role.value))
        db.commit()

        print(f"Creating {NUM_CUSTOMERS} customers...")
        customers = [
            Customer(
                id=uuid.uuid4(),
                email=fake.unique.email(),
                name=fake.name(),
                country=fake.country_code(),
            )
            for _ in range(NUM_CUSTOMERS)
        ]
        db.add_all(customers)

        print(f"Creating {NUM_TRANSACTIONS} transactions over {DAYS} days...")
        now = datetime.now(timezone.utc)
        refunds_created = 0

        for _ in range(NUM_TRANSACTIONS):
            customer = random.choice(customers) if random.random() < 0.8 else None
            seconds_offset = random.randint(0, DAYS * 24 * 60 * 60)
            created_at = now - timedelta(seconds=seconds_offset)

            amount = Decimal(str(round(random.uniform(5.0, 500.0), 2)))
            status = weighted_choice(STATUS_WEIGHTS)
            method = weighted_choice(METHOD_WEIGHTS)

            txn = Transaction(
                id=uuid.uuid4(),
                customer_id=customer.id if customer else None,
                amount=amount,
                currency="USD",
                status=status,
                payment_method=method,
                description=fake.sentence(nb_words=4).rstrip("."),
                created_at=created_at,
            )
            db.add(txn)

            if status == TransactionStatus.refunded:
                refund_amount = (
                    amount
                    if random.random() < 0.7
                    else (amount * Decimal("0.5")).quantize(Decimal("0.01"))
                )
                refund_at = min(
                    created_at + timedelta(days=random.randint(1, 7)),
                    now,
                )
                db.add(
                    Refund(
                        id=uuid.uuid4(),
                        transaction_id=txn.id,
                        amount=refund_amount,
                        reason=random.choice(REFUND_REASONS),
                        created_at=refund_at,
                    )
                )
                refunds_created += 1

        db.commit()

        revenue = db.execute(
            text(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions "
                "WHERE status = 'succeeded'"
            )
        ).scalar()
        print()
        print("Seed complete:")
        print(f"  Customers:    {NUM_CUSTOMERS}")
        print(f"  Transactions: {NUM_TRANSACTIONS}")
        print(f"  Refunds:      {refunds_created}")
        print(f"  Revenue (succeeded only): ${revenue}")
        print()
        print("Dev users (do not use in production):")
        for email, _password, role in DEV_USERS:
            print(f"  {email:<25} role={role.value:<8} password=devpassword")
    finally:
        db.close()


if __name__ == "__main__":
    main()
