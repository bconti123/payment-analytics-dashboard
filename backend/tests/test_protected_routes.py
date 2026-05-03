"""Auth gating on existing routers.

Confirms each protected route returns 401 without a token, and that the
viewer role gets 403 on admin-only writes.
"""
import pytest

GET_PROTECTED = [
    "/api/v1/transactions",
    "/api/v1/refunds",
    "/api/v1/dashboard/summary",
    "/api/v1/dashboard/revenue-trend",
    "/api/v1/dashboard/refund-trend",
    "/api/v1/dashboard/anomalies",
    "/api/v1/insights/weekly",
]


@pytest.mark.parametrize("path", GET_PROTECTED)
def test_get_routes_require_auth(unauthed_client, path):
    res = unauthed_client.get(path)
    assert res.status_code == 401, f"{path} returned {res.status_code}, expected 401"


def test_post_transactions_requires_auth(unauthed_client):
    res = unauthed_client.post("/api/v1/transactions", json={})
    assert res.status_code == 401


def test_post_refunds_requires_auth(unauthed_client):
    res = unauthed_client.post("/api/v1/refunds", json={})
    assert res.status_code == 401


def test_post_imports_requires_auth(unauthed_client):
    res = unauthed_client.post("/api/v1/imports/csv")
    assert res.status_code == 401


def test_health_and_root_remain_open(unauthed_client):
    assert unauthed_client.get("/health").status_code == 200
    assert unauthed_client.get("/").status_code == 200


def test_viewer_can_read_dashboard(unauthed_client, viewer_headers):
    res = unauthed_client.get("/api/v1/dashboard/summary", headers=viewer_headers)
    assert res.status_code == 200


def test_viewer_can_list_transactions(unauthed_client, viewer_headers):
    res = unauthed_client.get("/api/v1/transactions", headers=viewer_headers)
    assert res.status_code == 200


def test_viewer_cannot_create_transaction(unauthed_client, viewer_headers):
    res = unauthed_client.post(
        "/api/v1/transactions",
        headers=viewer_headers,
        json={
            "amount": "10.00",
            "currency": "USD",
            "status": "succeeded",
            "payment_method": "card",
        },
    )
    assert res.status_code == 403


def test_viewer_cannot_create_refund(unauthed_client, viewer_headers):
    res = unauthed_client.post(
        "/api/v1/refunds",
        headers=viewer_headers,
        json={"transaction_id": "00000000-0000-0000-0000-000000000000", "amount": "1.00"},
    )
    assert res.status_code == 403


def test_viewer_cannot_upload_csv(unauthed_client, viewer_headers):
    res = unauthed_client.post(
        "/api/v1/imports/csv",
        headers=viewer_headers,
        files={"file": ("x.csv", b"id\n1\n", "text/csv")},
    )
    assert res.status_code == 403


def test_admin_can_create_transaction(unauthed_client, admin_headers):
    res = unauthed_client.post(
        "/api/v1/transactions",
        headers=admin_headers,
        json={
            "amount": "10.00",
            "currency": "USD",
            "status": "succeeded",
            "payment_method": "card",
        },
    )
    assert res.status_code == 201
