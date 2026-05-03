from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings
from app.models.user import User, UserRole

_password_hash = PasswordHash((BcryptHasher(),))

ISSUER = "payment-analytics"


class InvalidTokenError(Exception):
    """Raised when a JWT cannot be decoded or has expired."""


def hash_password(plain: str) -> str:
    return _password_hash.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _password_hash.verify(plain, hashed)


def create_access_token(user: User, *, ttl: timedelta | None = None) -> str:
    now = datetime.now(timezone.utc)
    expires = now + (ttl or timedelta(minutes=settings.jwt_access_ttl_minutes))
    payload: dict[str, Any] = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "iss": ISSUER,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer=ISSUER,
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

    sub = payload.get("sub")
    role = payload.get("role")
    if not isinstance(sub, str) or not isinstance(role, str):
        raise InvalidTokenError("missing required claims")
    try:
        UUID(sub)
        UserRole(role)
    except ValueError as exc:
        raise InvalidTokenError(str(exc)) from exc

    return payload
