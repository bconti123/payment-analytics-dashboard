"""CSV import for Stripe-style payment exports.

Expected columns: id, created, amount, currency, status, payment_method,
customer_email, description.

Per-row semantics:
- amount is in cents (Stripe convention) and is converted to decimal dollars.
- created is parsed as ISO 8601; tz-naive values are assumed UTC.
- customer is upserted by email.
- duplicate (existing) external_id is skipped, not an error.
- per-row failures are collected and returned alongside successful inserts;
  a bad row never aborts the rest of the file.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Customer,
    PaymentMethod,
    Transaction,
    TransactionStatus,
)
from app.schemas.imports import ImportResult, ImportRowError

REQUIRED_COLUMNS = {
    "id",
    "created",
    "amount",
    "currency",
    "status",
    "payment_method",
    "customer_email",
}


class CsvFormatError(Exception):
    """Raised when the file cannot be parsed or is missing required columns."""


def _parse_dataframe(content: bytes) -> pd.DataFrame:
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str, keep_default_na=False)
    except Exception as e:
        raise CsvFormatError(f"could not parse CSV: {e}") from e

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise CsvFormatError(
            f"missing required columns: {', '.join(sorted(missing))}"
        )
    return df


def _coerce_row(row: pd.Series) -> dict:
    """Validate one row. Raises ValueError with a human-readable message."""
    external_id = (row["id"] or "").strip()
    if not external_id:
        raise ValueError("id is required")

    try:
        cents = int(row["amount"])
    except (TypeError, ValueError) as e:
        raise ValueError(f"amount must be an integer (cents), got {row['amount']!r}") from e
    if cents < 0:
        raise ValueError(f"amount must be >= 0, got {cents}")
    try:
        amount = (Decimal(cents) / Decimal(100)).quantize(Decimal("0.01"))
    except InvalidOperation as e:
        raise ValueError(f"amount could not be converted to decimal: {e}") from e

    created_raw = (row["created"] or "").strip()
    if not created_raw:
        raise ValueError("created is required")
    try:
        created = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
    except ValueError as e:
        raise ValueError(f"created must be ISO 8601, got {created_raw!r}") from e
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    status_raw = (row["status"] or "").strip()
    try:
        status = TransactionStatus(status_raw)
    except ValueError as e:
        raise ValueError(
            f"status must be one of {[s.value for s in TransactionStatus]}, "
            f"got {status_raw!r}"
        ) from e

    method_raw = (row["payment_method"] or "").strip()
    try:
        method = PaymentMethod(method_raw)
    except ValueError as e:
        raise ValueError(
            f"payment_method must be one of {[m.value for m in PaymentMethod]}, "
            f"got {method_raw!r}"
        ) from e

    currency = (row["currency"] or "").strip().upper()
    if len(currency) != 3:
        raise ValueError(f"currency must be a 3-letter code, got {currency!r}")

    email = (row["customer_email"] or "").strip().lower()
    if not email or "@" not in email:
        raise ValueError(f"customer_email is required and must look like an email, got {email!r}")

    description = (row.get("description") or "").strip() or None

    return {
        "external_id": external_id,
        "amount": amount,
        "currency": currency,
        "status": status,
        "payment_method": method,
        "created": created,
        "customer_email": email,
        "description": description,
    }


def _get_or_create_customer(db: Session, email: str, cache: dict[str, Customer]) -> Customer:
    if email in cache:
        return cache[email]
    customer = db.scalar(select(Customer).where(Customer.email == email))
    if customer is None:
        customer = Customer(email=email)
        db.add(customer)
        db.flush()
    cache[email] = customer
    return customer


def import_csv(db: Session, content: bytes) -> ImportResult:
    df = _parse_dataframe(content)

    existing_ids: set[str] = set(
        db.scalars(
            select(Transaction.external_id).where(Transaction.external_id.isnot(None))
        )
    )

    customer_cache: dict[str, Customer] = {}
    errors: list[ImportRowError] = []
    imported = 0
    skipped = 0

    for idx, row in df.iterrows():
        # idx is the 0-based pandas index; report row numbers as 1-based with
        # +2 to account for the header row, matching how a spreadsheet displays.
        row_no = int(idx) + 2  # type: ignore[arg-type]
        try:
            data = _coerce_row(row)
        except ValueError as e:
            errors.append(ImportRowError(row=row_no, message=str(e)))
            continue

        if data["external_id"] in existing_ids:
            skipped += 1
            continue

        customer = _get_or_create_customer(db, data["customer_email"], customer_cache)
        txn = Transaction(
            external_id=data["external_id"],
            amount=data["amount"],
            currency=data["currency"],
            status=data["status"],
            payment_method=data["payment_method"],
            description=data["description"],
            created_at=data["created"],
            customer_id=customer.id,
        )
        db.add(txn)
        existing_ids.add(data["external_id"])
        imported += 1

    db.commit()

    return ImportResult(
        imported=imported,
        skipped=skipped,
        failed=len(errors),
        errors=errors,
    )
