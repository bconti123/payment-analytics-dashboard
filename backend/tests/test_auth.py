from datetime import timedelta

from app.core.security import create_access_token


def test_login_success_returns_bearer_token(unauthed_client, admin_user):
    res = unauthed_client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email, "password": "adminpassword"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert isinstance(body["access_token"], str) and len(body["access_token"]) > 20


def test_login_is_case_insensitive_on_email(unauthed_client, admin_user):
    res = unauthed_client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email.upper(), "password": "adminpassword"},
    )
    assert res.status_code == 200


def test_login_wrong_password_returns_401(unauthed_client, admin_user):
    res = unauthed_client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email, "password": "wrong"},
    )
    assert res.status_code == 401


def test_login_unknown_email_returns_401(unauthed_client):
    res = unauthed_client.post(
        "/api/v1/auth/login",
        data={"username": "nobody@example.com", "password": "whatever"},
    )
    assert res.status_code == 401


def test_me_requires_token(unauthed_client):
    res = unauthed_client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_me_returns_user_without_password(unauthed_client, admin_token, admin_user):
    res = unauthed_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["email"] == admin_user.email
    assert body["role"] == "admin"
    assert "hashed_password" not in body
    assert "password" not in body


def test_me_with_expired_token_returns_401(unauthed_client, admin_user):
    expired = create_access_token(admin_user, ttl=timedelta(seconds=-10))
    res = unauthed_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert res.status_code == 401


def test_me_with_garbage_token_returns_401(unauthed_client):
    res = unauthed_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert res.status_code == 401


def test_register_requires_admin_token(unauthed_client):
    res = unauthed_client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "newpassword"},
    )
    assert res.status_code == 401


def test_register_as_viewer_is_forbidden(unauthed_client, viewer_token):
    res = unauthed_client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {viewer_token}"},
        json={"email": "new@example.com", "password": "newpassword"},
    )
    assert res.status_code == 403


def test_register_as_admin_creates_user(unauthed_client, admin_token):
    res = unauthed_client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"email": "Newuser@example.com", "password": "newpassword"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "newuser@example.com"
    assert body["role"] == "viewer"
    assert "id" in body
    assert "hashed_password" not in body


def test_register_duplicate_email_returns_409(unauthed_client, admin_token, admin_user):
    res = unauthed_client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"email": admin_user.email, "password": "newpassword"},
    )
    assert res.status_code == 409


def test_register_short_password_rejected(unauthed_client, admin_token):
    res = unauthed_client.post(
        "/api/v1/auth/register",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"email": "ok@example.com", "password": "short"},
    )
    assert res.status_code == 422
