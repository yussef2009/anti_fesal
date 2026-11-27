"""
Anti-Fesal (آنتي فصال) - Tests for Auth/RBAC, Role Separation, Onboarding,
Settlement/Conflict Guards, Driver Live Tracking, Chatbot Compare, Visual Inspector, and Admin Analytics
"""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from config import ADMIN_ACCESS_PIN, CAPTAIN_ACCESS_PIN, IMAGES_DIR
from backend.agents.marketing_autoreply import marketing_autoreply
from backend.agents.visual_inspector import VisualInspectorAgent
from backend.db_adapter import DatabaseAdapter, db
from backend.main import ALLOWED_ORIGINS, _verify_session_token, app, serve_frontend_files

client = TestClient(app)


def _get_gate_headers(portal: str) -> dict:
    pin = CAPTAIN_ACCESS_PIN if portal == "captain" else ADMIN_ACCESS_PIN
    res = client.post("/api/auth/gate", json={"portal": portal, "pin": pin})
    assert res.status_code == 200, res.text
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_auth_rbac_and_security_controls():
    assert "*" not in ALLOWED_ORIGINS

    # 1. Register forces role='buyer' regardless of requested role and hashes password
    suffix = uuid.uuid4().hex[:8]
    reg_payload = {
        "name": "مشتري اختباري",
        "username": f"buyer_{suffix}",
        "email": f"buyer_{suffix}@example.com",
        "password": "StrongPassword!2026",
        "role": "admin",
        "district": "Smouha",
        "phone": "01011119999",
    }
    res_reg = client.post("/api/auth/register", json=reg_payload)
    assert res_reg.status_code == 200, res_reg.text
    reg_data = res_reg.json()
    assert reg_data["user"]["role"] == "buyer"
    assert reg_data["token"]
    buyer_headers = {"Authorization": f"Bearer {reg_data['token']}"}

    # Stored password_hash must be salted PBKDF2, never plaintext
    auth_rec = db.get_user_for_auth(reg_payload["username"])
    assert auth_rec is not None
    assert auth_rec["password_hash"].startswith("pbkdf2_sha256$")

    # 2. Standard login rejects unknown users & wrong passwords, accepts valid credentials
    res_unknown = client.post(
        "/api/auth/login",
        json={"login_type": "standard", "username_or_email": f"nonexistent_{suffix}", "password": "any"},
    )
    assert res_unknown.status_code == 401

    res_bad_pw = client.post(
        "/api/auth/login",
        json={"login_type": "standard", "username_or_email": reg_payload["username"], "password": "wrong"},
    )
    assert res_bad_pw.status_code == 401

    res_login = client.post(
        "/api/auth/login",
        json={
            "login_type": "standard",
            "username_or_email": reg_payload["username"],
            "password": "StrongPassword!2026",
        },
    )
    assert res_login.status_code == 200, res_login.text
    assert res_login.json()["token"]
    assert "password_hash" not in res_login.json()["user"]

    # 3. Google demo login only ever yields 'buyer' + valid token
    res_google = client.post("/api/auth/login", json={"login_type": "google", "role": "admin"})
    assert res_google.status_code == 200, res_google.text
    assert res_google.json()["user"]["role"] == "buyer"
    assert res_google.json()["token"]

    # 4. Gate rejects invalid PINs
    res_bad_gate = client.post("/api/auth/gate", json={"portal": "admin", "pin": "WRONG-PIN"})
    assert res_bad_gate.status_code == 401

    # 5. Unauthenticated & spoofed X-Dev-Role requests are rejected with 401 under AUTH_ENFORCE=1
    spoof_headers = {"X-Dev-Role": "admin"}
    for method, path, body in [
        ("GET", "/api/admin/analytics", None),
        ("GET", "/api/admin/applications", None),
        ("GET", "/api/admin/users", None),
        ("GET", "/api/logs/automation", None),
        ("POST", "/api/catalog/run", None),
        ("POST", "/api/review/AF-1001", {"action": "APPROVE"}),
        ("POST", "/api/driver/location", {"driver_id": "DRV-1", "lat": 31.2, "lng": 29.9}),
        ("POST", "/api/dispatches/DISP-3001/step", {"step": "PICKED_UP"}),
        ("POST", "/api/dispatches/DISP-3001/status", {"status": "IN_TRANSIT"}),
        ("POST", "/api/intake", {"title": "Test", "description": "Test desc", "district": "Smouha"}),
        ("GET", "/api/user/account-data", None),
    ]:
        res = client.request(method, path, json=body, headers=spoof_headers)
        assert res.status_code == 401, f"{method} {path} unexpectedly returned {res.status_code}"

    # 6. Authenticated buyer is rejected with 403 on privileged endpoints
    for method, path, body in [
        ("GET", "/api/admin/analytics", None),
        ("GET", "/api/admin/applications", None),
        ("GET", "/api/logs/automation", None),
        ("POST", "/api/catalog/run", None),
        ("POST", "/api/review/AF-1001", {"action": "APPROVE"}),
        ("POST", "/api/driver/location", {"driver_id": "DRV-1", "lat": 31.2, "lng": 29.9}),
        ("POST", "/api/dispatches/DISP-3001/step", {"step": "PICKED_UP"}),
        ("POST", "/api/intake", {"title": "Test", "description": "Test desc", "district": "Smouha"}),
    ]:
        res = client.request(method, path, json=body, headers=buyer_headers)
        assert res.status_code == 403, f"Buyer on {method} {path} returned {res.status_code}"

    # 7. Captain token cannot access admin endpoints (403)
    captain_headers = _get_gate_headers("captain")
    assert client.get("/api/admin/analytics", headers=captain_headers).status_code == 403

    # 8. Account data has zero cross-user fallback for a fresh buyer
    res_acc = client.get("/api/user/account-data", headers=buyer_headers)
    assert res_acc.status_code == 200, res_acc.text
    acc = res_acc.json()
    assert acc["seller_data"]["items_count"] == 0
    assert acc["seller_data"]["recent_items"] == []
    assert acc["buyer_data"]["active_reservations"] == 0
    assert acc["buyer_data"]["recent_deals"] == []
    assert acc["delivery_data"]["recent_dispatches"] == []


def test_seller_and_driver_onboarding_lifecycle():
    admin_headers = _get_gate_headers("admin")
    suffix = uuid.uuid4().hex[:6].upper()
    seller_uid = f"TEST_SELLER_{suffix}"
    driver_uid = f"TEST_DRIVER_{suffix}"

    # 1. Submit seller application with payout_account and tier
    seller_payload = {
        "user_id": seller_uid,
        "name": "يوسف الشناوي",
        "phone": "01099998888",
        "role": "seller",
        "district": "El-Attarine",
        "application_data": {
            "shop_name": "معرض العطارين للأثاث",
            "business_type": "showroom",
            "national_id": "29901011234567",
            "tier": "Pro Trader",
            "payout_account": "01099998888",
        },
    }
    res_seller = client.post("/api/applications/apply", json=seller_payload)
    assert res_seller.status_code == 200, res_seller.text
    seller_app = res_seller.json()
    assert seller_app["status"] == "PENDING_APPROVAL"
    seller_app_id = seller_app["id"]

    # 2. Check seller status and persisted fields
    res_status = client.get(f"/api/applications/my-status?user_id={seller_uid}")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["has_application"] is True
    assert status_data["application"]["status"] == "PENDING_APPROVAL"
    assert status_data["application"]["application_data"]["payout_account"] == "01099998888"
    assert status_data["application"]["application_data"]["tier"] == "Pro Trader"

    # 3. Driver application WITHOUT GPS consent must be rejected (400)
    res_driver_no_gps = client.post(
        "/api/applications/apply",
        json={
            "user_id": driver_uid,
            "name": "كابتن بدون موافقة",
            "phone": "01233330000",
            "role": "driver",
            "district": "Sidi Beshr",
            "consent_location": False,
        },
    )
    assert res_driver_no_gps.status_code == 400

    # 4. Submit valid driver application with GPS consent
    driver_payload = {
        "user_id": driver_uid,
        "name": "أحمد الإسكندراني",
        "phone": "01233334444",
        "role": "driver",
        "district": "Sidi Beshr",
        "application_data": {
            "national_id": "29801017654321",
            "vehicle_type": "pickup",
            "vehicle_plate": "س ق ب 4589",
            "license_number": "LIC-90812",
            "gps_consent_accepted": True,
        },
    }
    res_driver = client.post("/api/applications/apply", json=driver_payload)
    assert res_driver.status_code == 200, res_driver.text
    driver_app_id = res_driver.json()["id"]

    # 5. Admin lists pending applications
    res_admin_apps = client.get("/api/admin/applications?status=PENDING_APPROVAL", headers=admin_headers)
    assert res_admin_apps.status_code == 200, res_admin_apps.text
    app_ids = [a["id"] for a in res_admin_apps.json()["applications"]]
    assert seller_app_id in app_ids
    assert driver_app_id in app_ids

    # 6. Admin approves seller application -> unseeded user upserted into users table
    res_review_seller = client.post(
        f"/api/admin/applications/{seller_app_id}/review",
        json={"action": "APPROVED", "notes": "تم فحص السجل التجاري والاعتماد بنجاح"},
        headers=admin_headers,
    )
    assert res_review_seller.status_code == 200, res_review_seller.text
    assert res_review_seller.json()["application"]["status"] == "APPROVED"
    assert db.get_user_by_id(seller_uid)["role"] == "seller"

    # 7. Admin approves driver application -> auto-inserted into drivers fleet + users table
    res_review_driver = client.post(
        f"/api/admin/applications/{driver_app_id}/review",
        json={"action": "APPROVED", "notes": "تم اعتماد رخصة القيادة والسيارة"},
        headers=admin_headers,
    )
    assert res_review_driver.status_code == 200, res_review_driver.text
    assert res_review_driver.json()["application"]["status"] == "APPROVED"
    assert db.get_user_by_id(driver_uid)["role"] == "driver"
    driver_ids = [d["id"] for d in db.get_drivers()]
    assert driver_uid in driver_ids


def test_driver_gps_streaming_and_live_tracking():
    captain_headers = _get_gate_headers("captain")

    # 1. Update driver location (authenticated as captain)
    loc_payload = {
        "driver_id": "DRV-101",
        "driver_name": "كابتن أحمد الإسكندراني",
        "lat": 31.2250,
        "lng": 29.9550,
        "heading": 90.0,
        "sharing_enabled": True,
    }
    res_loc = client.post("/api/driver/location", json=loc_payload, headers=captain_headers)
    assert res_loc.status_code == 200, res_loc.text
    assert res_loc.json()["status"] == "LOCATION_UPDATED"

    # 2. Live tracking queries driver_locations for real GPS coords
    res_track = client.get("/api/dispatches/DISP-3001/live-tracking")
    assert res_track.status_code == 200, res_track.text
    track_data = res_track.json()
    assert track_data["gps_live"] is True
    assert track_data["driver_coords"] == {"lat": 31.2250, "lng": 29.9550}
    assert track_data["driver"]["lat"] == 31.2250
    assert track_data["driver"]["lng"] == 29.9550
    assert track_data["pickup_coords"]["lat"] is not None
    assert track_data["delivery_coords"]["lat"] is not None
    assert "calculated_eta_mins" in track_data

    # 3. Advance dispatch step (authenticated as captain)
    res_step = client.post(
        "/api/dispatches/DISP-3001/step",
        json={"step": "PICKED_UP"},
        headers=captain_headers,
    )
    assert res_step.status_code == 200, res_step.text
    assert res_step.json()["current_step"] == "PICKED_UP"


def test_double_settlement_rejection_and_delivery_lifecycle():
    admin_headers = _get_gate_headers("admin")
    captain_headers = _get_gate_headers("captain")

    # 1. Create a fresh low-confidence item via intake and adjust it via HITL review
    res_intake = client.post(
        "/api/intake",
        json={
            "title": "تلاجة توشيبا اختبارية",
            "description": "blurry photo unverified toshiba refrigerator",
            "district": "El-Attarine",
            "seller_phone": "01055551111",
            "seller_tier": "Everyday Seller",
            "image_urls": ["default.jpg"],
        },
        headers=admin_headers,
    )
    assert res_intake.status_code == 200, res_intake.text
    item_id = res_intake.json()["item_id"]

    res_adjust = client.post(
        f"/api/review/{item_id}",
        json={"action": "ADJUST", "corrected_grade": "A", "corrected_price": 10000.0},
        headers=admin_headers,
    )
    assert res_adjust.status_code == 200, res_adjust.text
    adjusted_item = db.get_item_by_id(item_id)
    assert adjusted_item["recommended_purchase_price"] == 7200.0
    assert adjusted_item["commission_amount"] == 800.0

    # 2. First settlement succeeds and stores separated delivery_address & delivery_district
    res_settle = client.post(
        "/api/settle",
        json={
            "item_id": item_id,
            "buyer_id": "01288887777",
            "delivery_address": "15 شارع الإقبال، لوران، الإسكندرية",
            "delivery_district": "Loran",
        },
    )
    assert res_settle.status_code == 200, res_settle.text
    settle_data = res_settle.json()
    deal_id = settle_data["deal_id"]
    dispatch_id = settle_data["dispatch"]["dispatch_id"]
    assert settle_data["delivery_district"] == "Loran"

    # Live tracking honors stored delivery_district='Loran' instead of hardcoded Sidi Beshr/Smouha
    res_live = client.get(f"/api/dispatches/{dispatch_id}/live-tracking")
    assert res_live.status_code == 200, res_live.text
    assert res_live.json()["delivery_district"] == "Loran"

    # 3. Second settlement on the same DISPATCHED item returns HTTP 409 Conflict
    res_double = client.post(
        "/api/settle",
        json={
            "item_id": item_id,
            "buyer_id": "01299990000",
            "delivery_address": "سموحة",
            "delivery_district": "Smouha",
        },
    )
    assert res_double.status_code == 409

    # 4. Loose address substring tracking is rejected (404), exact deal_id tracking succeeds
    assert client.get("/api/track/الإقبال").status_code == 404
    res_track_exact = client.get(f"/api/track/{deal_id}")
    assert res_track_exact.status_code == 200
    assert res_track_exact.json()["deal"]["id"] == deal_id

    # 5. Transitioning step to DELIVERED_SETTLED marks dispatch COMPLETED, deal SETTLED, and item SOLD
    res_final = client.post(
        f"/api/dispatches/{dispatch_id}/step",
        json={"step": "DELIVERED_SETTLED"},
        headers=captain_headers,
    )
    assert res_final.status_code == 200, res_final.text
    assert db.get_dispatch_by_ref(dispatch_id)["status"] == "COMPLETED"
    assert db.get_item_by_id(item_id)["status"] == "SOLD"
    deals = db.get_deals(limit=500)
    matched_deal = next(d for d in deals if d["id"] == deal_id)
    assert matched_deal["status"] == "SETTLED"

    # Settling a SOLD item also returns 409
    res_after_sold = client.post(
        "/api/settle",
        json={"item_id": item_id, "buyer_id": "01299990000"},
    )
    assert res_after_sold.status_code == 409


def test_chatbot_compare_and_visual_inspector_resilience():
    # 1. Explicit comparison and Arabic natural-language comparison
    res_cmp = client.post("/api/chatbot/compare", json={"message": "قارن بين غسالة ال جي وزانوسي"})
    assert res_cmp.status_code == 200, res_cmp.text
    data = res_cmp.json()
    assert data["verdict_ar"]
    assert data["verdict_en"]
    assert isinstance(data.get("items"), list) and len(data["items"]) >= 1

    # 2. VisualInspectorAgent: transient error must NOT permanently latch _auth_failed=True
    agent = VisualInspectorAgent()
    agent.api_key = "dummy-test-key"
    agent.has_gemini = True
    agent._auth_failed = False

    with patch.object(agent, "_call_gemini_vision", side_effect=RuntimeError("HTTP 503 transient overload")):
        res = agent.inspect_item("تلاجة توشيبا بحالة ممتازة")
    assert res["category"] == "Appliances"
    assert agent._auth_failed is False

    # 3. VisualInspectorAgent supports loading local /images/<name> from IMAGES_DIR
    tmp_img_name = f"test_probe_{uuid.uuid4().hex[:6]}.jpg"
    tmp_img_path = IMAGES_DIR / tmp_img_name
    try:
        tmp_img_path.write_bytes(b"\xff\xd8\xff\xe0TESTJPEG")
        loaded = agent._load_image_bytes(f"/images/{tmp_img_name}")
        assert loaded is not None
        assert loaded[0] == b"\xff\xd8\xff\xe0TESTJPEG"
        assert loaded[1] == "image/jpeg"
    finally:
        if tmp_img_path.exists():
            tmp_img_path.unlink()


def test_admin_analytics_metrics():
    admin_headers = _get_gate_headers("admin")

    res_analytics = client.get("/api/admin/analytics", headers=admin_headers)
    assert res_analytics.status_code == 200, res_analytics.text
    data = res_analytics.json()

    assert "orders_sold_count" in data
    assert "top_categories" in data
    assert "top_locations" in data
    assert "financials" in data
    assert "gmv" in data["financials"]
    assert "platform_net_commission" in data["financials"]
    assert "driver_payouts" in data["financials"]
    assert isinstance(data["top_categories"], list)
    assert isinstance(data["top_locations"], list)

    res_users = client.get("/api/admin/users", headers=admin_headers)
    assert res_users.status_code == 200
    for u in res_users.json()["users"]:
        assert "password_hash" not in u


def test_path_traversal_marketing_links_and_mongodb_branches():
    # 1. Path traversal guard on serve_frontend_files
    with pytest.raises(HTTPException) as exc_info:
        serve_frontend_files("../config.py")
    assert exc_info.value.status_code == 403

    # 2. Marketing ad copy & autoreply links use #reserve?id=<item_id>
    sample_item = {
        "id": "AF-1001",
        "title": "تلاجة توشيبا",
        "brand_model": "Toshiba",
        "condition_grade": "A",
        "expected_resale_price": 14500.0,
        "district": "Sidi Beshr",
        "status": "AUTO_APPROVED",
    }
    ad_copy = marketing_autoreply.generate_ad_copy(sample_item)
    assert "#reserve?id=AF-1001" in ad_copy["facebook_marketplace"]
    assert "#reserve?id=AF-1001" in ad_copy["whatsapp_catalog"]
    reply = marketing_autoreply.autoreply(sample_item, "ينفع فصال؟")
    assert reply["reservation_link"].endswith("/#reserve?id=AF-1001")

    # 3. MongoDB branches in DatabaseAdapter (metrics, drivers, financials, analytics, application sort)
    mongo_adapter = DatabaseAdapter.__new__(DatabaseAdapter)
    mongo_adapter.mode = "mongodb"
    mock_db = MagicMock()
    mongo_adapter.mongo_db = mock_db

    mock_db.items.count_documents.side_effect = [10, 8, 2]
    mock_db.deals.aggregate.return_value = [{"total": 800.0, "gmv": 10000.0, "comm": 800.0, "count": 2}]
    metrics = mongo_adapter.get_metrics()
    assert metrics["storage_mode"] == "mongodb"
    assert metrics["total_items"] == 10
    assert metrics["locked_commission_total"] == 800.0

    mock_db.drivers.find.return_value.sort.return_value = [
        {"_id": "oid1", "id": "DRV-1", "name": "كابتن", "status": "FREE"}
    ]
    assert mongo_adapter.get_drivers()[0]["id"] == "DRV-1"

    mock_db.drivers.update_one.return_value = MagicMock(matched_count=1)
    assert mongo_adapter.update_driver_status("DRV-1", "ON_DELIVERY", "DEAL-1") is True

    mock_db.deals.aggregate.return_value = [{"gmv": 10000.0, "comm": 800.0, "count": 2}]
    mock_db.dispatches.aggregate.return_value = [{"payouts": 7200.0}]
    mock_db.users.count_documents.side_effect = [5, 1]
    fin = mongo_adapter.get_financials_summary()
    assert fin["total_gmv"] == 10000.0
    assert fin["total_deals_count"] == 2

    mock_db.deals.find.return_value = []
    mock_db.dispatches.aggregate.return_value = []
    mock_db.applications.count_documents.return_value = 0
    mock_db.users.count_documents.side_effect = [5]
    analytics = mongo_adapter.get_admin_analytics()
    assert analytics["total_orders_sold"] == 0
    assert analytics["total_gmv"] == 0.0
    assert analytics["top_categories"] == []
    assert analytics["top_districts"] == []

    # Verify get_application_by_user sorts descending in MongoDB mode
    mock_db.applications.find.return_value.sort.return_value.limit.return_value = [
        {"_id": "oid2", "id": "APP-2", "user_id": "U1", "status": "APPROVED"}
    ]
    latest_app = mongo_adapter.get_application_by_user("U1")
    assert latest_app["id"] == "APP-2"
    mock_db.applications.find.return_value.sort.assert_called_with("created_at", -1)


def test_live_role_resolution_after_kyc_approval():
    admin_headers = _get_gate_headers("admin")
    suffix = uuid.uuid4().hex[:8]

    # 1. Register a fresh buyer and capture their original bearer token (claims role='buyer')
    res_reg = client.post(
        "/api/auth/register",
        json={
            "name": "بائع جديد بالإسكندرية",
            "username": f"kyc_buyer_{suffix}",
            "email": f"kyc_buyer_{suffix}@example.com",
            "password": "StrongPassword!2026",
            "role": "buyer",
            "district": "Smouha",
            "phone": "01077778888",
        },
    )
    assert res_reg.status_code == 200, res_reg.text
    reg_data = res_reg.json()
    buyer_uid = reg_data["user"]["id"]
    original_token = reg_data["token"]
    assert _verify_session_token(original_token)["role"] == "buyer"
    original_headers = {"Authorization": f"Bearer {original_token}"}

    # Before KYC approval, buyer cannot call POST /api/intake (403)
    intake_payload = {
        "title": "غسالة ال جي اختبارية",
        "description": "غسالة LG بحالة ممتازة استخدام بسيط في سموحة",
        "district": "Smouha",
        "seller_phone": "01077778888",
        "seller_tier": "Everyday Seller",
        "image_urls": ["default.jpg"],
    }
    res_intake_before = client.post("/api/intake", json=intake_payload, headers=original_headers)
    assert res_intake_before.status_code == 403

    # 2. Authenticated buyer applies to become a seller
    res_apply = client.post(
        "/api/applications/apply",
        json={
            "name": "بائع جديد بالإسكندرية",
            "phone": "01077778888",
            "role": "seller",
            "district": "Smouha",
            "application_data": {
                "shop_name": "معرض سموحة",
                "business_type": "individual",
                "national_id": "29905051234567",
                "tier": "Everyday Seller",
                "payout_account": "01077778888",
            },
        },
        headers=original_headers,
    )
    assert res_apply.status_code == 200, res_apply.text
    app_id = res_apply.json()["id"]
    assert res_apply.json()["user_id"] == buyer_uid

    # While pending approval, my-status must not issue a refreshed token
    res_pending_status = client.get("/api/applications/my-status", headers=original_headers)
    assert res_pending_status.status_code == 200, res_pending_status.text
    assert res_pending_status.json()["application"]["status"] == "PENDING_APPROVAL"
    assert "token" not in res_pending_status.json()

    # 3. Admin approves the seller application
    res_approve = client.post(
        f"/api/admin/applications/{app_id}/review",
        json={"action": "APPROVED", "notes": "اعتماد فوري للبائع"},
        headers=admin_headers,
    )
    assert res_approve.status_code == 200, res_approve.text
    assert db.get_user_by_id(buyer_uid)["role"] == "seller"

    # 4. Buyer can IMMEDIATELY call POST /api/intake using their ORIGINAL bearer token (no 403)
    res_intake_after = client.post("/api/intake", json=intake_payload, headers=original_headers)
    assert res_intake_after.status_code == 200, res_intake_after.text
    created_item_id = res_intake_after.json()["item_id"]
    assert db.get_item_by_id(created_item_id)["seller_id"] == buyer_uid

    # 5. Authenticated GET /api/applications/my-status returns a refreshed seller token;
    #    unauthenticated caller does not receive a token
    res_anon_status = client.get(f"/api/applications/my-status?user_id={buyer_uid}")
    assert res_anon_status.status_code == 200, res_anon_status.text
    assert "token" not in res_anon_status.json()

    res_auth_status = client.get(f"/api/applications/my-status?user_id={buyer_uid}", headers=original_headers)
    assert res_auth_status.status_code == 200, res_auth_status.text
    status_payload = res_auth_status.json()
    assert status_payload["has_application"] is True
    assert status_payload["application"]["status"] == "APPROVED"
    assert status_payload.get("token")
    refreshed_claims = _verify_session_token(status_payload["token"])
    assert refreshed_claims["user_id"] == buyer_uid
    assert refreshed_claims["role"] == "seller"

    # 6. Admin blocking the user immediately rejects existing session tokens with 403
    res_block = client.post(
        f"/api/admin/users/{buyer_uid}/status",
        json={"status": "BLOCKED"},
        headers=admin_headers,
    )
    assert res_block.status_code == 200, res_block.text
    assert client.post("/api/intake", json=intake_payload, headers=original_headers).status_code == 403
    assert (
        client.post(
            "/api/intake",
            json=intake_payload,
            headers={"Authorization": f"Bearer {status_payload['token']}"},
        ).status_code
        == 403
    )

    # 7. Scoped gate tokens continue to use their gate role directly
    captain_headers = _get_gate_headers("captain")
    assert client.get("/api/admin/analytics", headers=admin_headers).status_code == 200
    assert (
        client.post(
            "/api/driver/location",
            json={"driver_id": "DRV-101", "lat": 31.225, "lng": 29.955, "sharing_enabled": True},
            headers=captain_headers,
        ).status_code
        == 200
    )

