import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.transaction import PaymentMethod, TransactionStatus
from app.schemas.customer import CustomerNested


class TransactionBase(BaseModel):
    amount: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    status: TransactionStatus
    payment_method: PaymentMethod
    description: str | None = None


class TransactionCreate(TransactionBase):
    customer_id: uuid.UUID | None = None


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_id: uuid.UUID | None
    customer: CustomerNested | None = None
    created_at: datetime
