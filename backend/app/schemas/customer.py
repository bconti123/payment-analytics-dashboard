import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    email: str
    name: str | None = None
    country: str | None = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime


class CustomerNested(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
