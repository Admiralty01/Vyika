import asyncio
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # 1. Register User
    reg_payload = {
        "email": "newuser@domain.com",
        "full_name": "New User",
        "password": "SecurePassword123!",
        "country": "Nigeria"
    }
    res_reg = await client.post("/api/v1/auth/register", json=reg_payload)
    assert res_reg.status_code == 201
    data_reg = res_reg.json()
    assert "access_token" in data_reg
    assert data_reg["user"]["email"] == "newuser@domain.com"

    # 2. Login User
    login_payload = {
        "email": "newuser@domain.com",
        "password": "SecurePassword123!"
    }
    res_login = await client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()

@pytest.mark.asyncio
async def test_product_crud_and_sale_workflow(client: AsyncClient, admin_headers: dict, user_headers: dict):
    # 1. Create Product as Admin
    prod_payload = {
        "name": "Test Masterclass 2026",
        "description": "High converting digital course on sales",
        "price_usd": 100.0,
        "commission_type": "PERCENTAGE",
        "commission_value": 20.0,
        "status": "ACTIVE"
    }
    res_p = await client.post("/api/v1/products", json=prod_payload, headers=admin_headers)
    assert res_p.status_code == 201
    product = res_p.json()
    product_id = product["id"]

    # 2. User Submits Sale
    res_sale = await client.post("/api/v1/sales", json={"product_id": product_id}, headers=user_headers)
    assert res_sale.status_code == 201
    sale = res_sale.json()
    assert sale["status"] == "PENDING"
    assert float(sale["calculated_commission_usd"]) == 20.0

    sale_id = sale["id"]

    # 3. Verify Wallet BEFORE approval
    res_w1 = await client.get("/api/v1/wallet", headers=user_headers)
    assert float(res_w1.json()["available_balance_usd"]) == 0.0

    # 4. Admin Approves Sale (PENDING -> APPROVED / SOLD)
    res_review = await client.post(f"/api/v1/sales/{sale_id}/review", json={"status": "APPROVED"}, headers=admin_headers)
    assert res_review.status_code == 200
    assert res_review.json()["status"] == "APPROVED"

    # 5. Verify Duplicate Approval is Prevented (Must return HTTP 400)
    dup_review = await client.post(f"/api/v1/sales/{sale_id}/review", json={"status": "APPROVED"}, headers=admin_headers)
    assert dup_review.status_code == 400

    # 6. Verify Wallet AFTER approval ($20.00 credited)
    res_w2 = await client.get("/api/v1/wallet", headers=user_headers)
    assert float(res_w2.json()["available_balance_usd"]) == 20.0
    assert float(res_w2.json()["total_earned_usd"]) == 20.0

    # 7. Verify Transaction Ledger Entry
    res_tx = await client.get("/api/v1/transactions", headers=user_headers)
    assert len(res_tx.json()) == 1
    assert res_tx.json()[0]["type"] == "COMMISSION"

@pytest.mark.asyncio
async def test_withdrawal_workflow_and_balance_hold(client: AsyncClient, admin_headers: dict, user_headers: dict):
    # 1. Setup payment details
    pd_payload = {
        "payment_method": "Bank Transfer",
        "account_name": "Test User",
        "account_number": "1234567890",
        "bank_name": "First Bank",
        "country": "Nigeria"
    }
    await client.post("/api/v1/users/me/payment-details", json=pd_payload, headers=user_headers)

    # 2. Credit user wallet via admin balance adjustment
    res_me = await client.get("/api/v1/users/me", headers=user_headers)
    user_id = res_me.json()["id"]

    adj_res = await client.post(
        f"/api/v1/admin/users/{user_id}/balance-adjustment",
        json={"amount_usd": 100.0, "reason": "Initial deposit for testing"},
        headers=admin_headers
    )
    assert adj_res.status_code == 200

    # 3. Request withdrawal of $50
    wd_res = await client.post("/api/v1/withdrawals", json={"amount_usd": 50.0}, headers=user_headers)
    assert wd_res.status_code == 201
    wd = wd_res.json()
    assert wd["status"] == "PENDING"
    withdrawal_id = wd["id"]

    # Available balance should drop to $50, pending hold should be $50
    res_w = await client.get("/api/v1/wallet", headers=user_headers)
    assert float(res_w.json()["available_balance_usd"]) == 50.0
    assert float(res_w.json()["pending_withdrawal_usd"]) == 50.0

    # 4. Attempt second withdrawal for $75 (Exceeds remaining $50 -> MUST FAIL)
    fail_wd = await client.post("/api/v1/withdrawals", json={"amount_usd": 75.0}, headers=user_headers)
    assert fail_wd.status_code == 400

    # 5. Admin Approves & Marks Paid
    await client.post(f"/api/v1/withdrawals/{withdrawal_id}/review", json={"status": "APPROVED"}, headers=admin_headers)
    pay_res = await client.post(
        f"/api/v1/withdrawals/{withdrawal_id}/pay",
        params={"payment_ref": "REF-PAYOUT-999"},
        headers=admin_headers
    )
    assert pay_res.status_code == 200
    assert pay_res.json()["status"] == "PAID"

    # Pending hold should now be 0.0
    res_w_final = await client.get("/api/v1/wallet", headers=user_headers)
    assert float(res_w_final.json()["pending_withdrawal_usd"]) == 0.0

@pytest.mark.asyncio
async def test_admin_notifications_dispatched(client: AsyncClient, admin_headers: dict, user_headers: dict):
    # 1. Admin creates product
    prod = await client.post("/api/v1/products", json={
        "name": "Notification Test Prod",
        "description": "Valid product description here",
        "price_usd": 50.0,
        "commission_type": "FIXED",
        "commission_value": 10.0,
        "status": "ACTIVE"
    }, headers=admin_headers)
    prod_id = prod.json()["id"]

    # 2. User submits sale
    await client.post("/api/v1/sales", json={"product_id": prod_id}, headers=user_headers)

    # 3. Check Admin Notifications (Admin MUST receive notification for new sale)
    admin_notifs = await client.get("/api/v1/notifications", headers=admin_headers)
    assert admin_notifs.status_code == 200
    notif_list = admin_notifs.json()
    assert any("New Sale Submitted" in n["title"] for n in notif_list)

@pytest.mark.asyncio
async def test_idor_protection(client: AsyncClient, user_headers: dict, admin_headers: dict):
    # Create another regular user
    user2_reg = await client.post("/api/v1/auth/register", json={
        "email": "user2@domain.com",
        "full_name": "User Two",
        "password": "Password123!",
        "country": "Nigeria"
    })
    assert user2_reg.status_code == 201
    token2 = user2_reg.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Admin creates product
    prod = await client.post("/api/v1/products", json={
        "name": "IDOR Product",
        "description": "Valid product description here",
        "price_usd": 50.0,
        "commission_type": "FIXED",
        "commission_value": 10.0,
        "status": "ACTIVE"
    }, headers=admin_headers)
    assert prod.status_code == 201
    
    # User 1 submits sale
    sale = await client.post("/api/v1/sales", json={"product_id": prod.json()["id"]}, headers=user_headers)
    assert sale.status_code == 201
    sale_id = sale.json()["id"]

    # User 2 tries to access User 1's sale detail (MUST BE FORBIDDEN 403)
    res_idor = await client.get(f"/api/v1/sales/{sale_id}", headers=headers2)
    assert res_idor.status_code == 403
