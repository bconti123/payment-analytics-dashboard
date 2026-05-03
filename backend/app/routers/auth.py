from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.security import create_access_token
from app.models import User
from app.schemas import Token, UserCreate, UserOut
from app.services import BusinessRuleError, auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    user = auth_service.authenticate(db, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(
            status_code=http_status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user)
    return Token(
        access_token=token,
        expires_in=settings.jwt_access_ttl_minutes * 60,
    )


@router.post(
    "/register",
    response_model=UserOut,
    status_code=http_status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    try:
        user = auth_service.register_user(db, payload)
    except BusinessRuleError as e:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT, detail=str(e)
        )
    return UserOut.model_validate(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
