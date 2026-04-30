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
from app.main import app
from app.models import Base


def _test_database_url() -> str:
    if env_url := os.getenv("TEST_DATABASE_URL"):
        return env_url
    return str(make_url(settings.database_url).set(database="payment_analytics_test"))


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
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
