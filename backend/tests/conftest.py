"""Shared pytest fixtures.

Tests run against a separate database (default: payment_analytics_test).
One-time setup:
    createdb payment_analytics_test

You can override the URL with TEST_DATABASE_URL.
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.main import app
from app.models import Base, User, UserRole
from app.services.auth_service import ensure_user


def _test_database_url() -> str:
    if env_url := os.getenv("TEST_DATABASE_URL"):
        return env_url
    return make_url(settings.database_url).set(database="payment_analytics_test").render_as_string(hide_password=False)


@pytest.fixture(scope="session")
def engine():
    url = _test_database_url()
    eng = create_engine(url, pool_pre_ping=True, future=True)
    try:
        with eng.connect() as c:
            c.execute(text("SELECT 1"))
    except Exception as e:
        pytest.exit(
            f"\nCannot connect to test DB '{url}'.\n"
            f"Run once: createdb payment_analytics_test\n"
            f"Underlying error: {e}\n",
            returncode=2,
        )
    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db_session(engine):
    """Function-scoped session that rolls back after each test.

    Uses a SAVEPOINT-based pattern so even tests that exercise a route
    calling db.commit() get rolled back cleanly.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
        expire_on_commit=False,
    )
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def admin_user(db_session) -> User:
    user, _ = ensure_user(
        db_session,
        email="admin-fixture@example.com",
        password="adminpassword",
        role=UserRole.admin,
    )
    db_session.flush()
    return user


@pytest.fixture
def viewer_user(db_session) -> User:
    user, _ = ensure_user(
        db_session,
        email="viewer-fixture@example.com",
        password="viewerpassword",
        role=UserRole.viewer,
    )
    db_session.flush()
    return user


@pytest.fixture
def admin_token(admin_user) -> str:
    return create_access_token(admin_user)


@pytest.fixture
def viewer_token(viewer_user) -> str:
    return create_access_token(viewer_user)


@pytest.fixture
def admin_headers(admin_token) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def viewer_headers(viewer_token) -> dict[str, str]:
    return {"Authorization": f"Bearer {viewer_token}"}


@pytest.fixture
def client(db_session, admin_user):
    """Authenticated client used by the bulk of the test suite.

    Existing tests don't care about auth — they care about transaction/refund/
    dashboard logic. Overriding `get_current_user` here lets all 30 pre-auth
    tests stay unchanged. Tests that need to exercise the real auth dependency
    (login, role gates, 401/403 paths) use `unauthed_client` instead.
    """
    def _override_get_db():
        yield db_session

    def _override_current_user():
        return admin_user

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = _override_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def unauthed_client(db_session):
    """Client with the real auth dependency wired in. Use for auth tests."""
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
