from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.imports import ImportResult
from app.services import import_service
from app.services.import_service import CsvFormatError

router = APIRouter(prefix="/imports", tags=["imports"])

MAX_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/csv", response_model=ImportResult)
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ImportResult:
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="file is empty")
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"file exceeds {MAX_BYTES} bytes")

    try:
        return import_service.import_csv(db, content)
    except CsvFormatError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
