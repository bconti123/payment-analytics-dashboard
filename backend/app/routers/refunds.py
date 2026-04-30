from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import Page, RefundCreate, RefundOut
from app.services import BusinessRuleError, NotFoundError, refund_service

router = APIRouter(prefix="/refunds", tags=["refunds"])


@router.get("", response_model=Page[RefundOut])
def list_refunds(
    start: date | None = None,
    end: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
) -> Page[RefundOut]:
    items, total = refund_service.list_refunds(
        db, start=start, end=end, page=page, page_size=page_size
    )
    return Page[RefundOut](
        page=page,
        page_size=page_size,
        total=total,
        items=[RefundOut.model_validate(r) for r in items],
    )


@router.post(
    "",
    response_model=RefundOut,
    status_code=http_status.HTTP_201_CREATED,
)
def create_refund(payload: RefundCreate, db: Session = Depends(get_db)) -> RefundOut:
    try:
        return refund_service.create_refund(db, payload)
    except NotFoundError as e:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(e))
    except BusinessRuleError as e:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
