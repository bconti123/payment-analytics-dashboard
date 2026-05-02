from pydantic import BaseModel


class ImportRowError(BaseModel):
    row: int
    message: str


class ImportResult(BaseModel):
    imported: int
    skipped: int
    failed: int
    errors: list[ImportRowError]
