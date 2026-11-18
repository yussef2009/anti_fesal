"""
Anti-Fesal (آنتي فصال) - Tests for Role Separation, Application Gate, Driver Live Tracking & Admin Analytics
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db_adapter import db

client = TestClient(app)

def test_seller_and_driver_onboarding_lifecycle():
    # 1. Submit seller application
    seller_payload = {
        "user_id": "TEST_SELLER_99",
        "name": "يوسف الشناوي",
        "phone": "01099998888",
        "role": "seller",
        "district": "El-Attarine",
        "application_data": {
            "shop_name": "معرض العطارين للأثاث",
            "business_type": "showroom",
            "national_id": "29901011234567",
            "tier": "pro",
            "payout_account": "01099998888"
        }
    }
    res_seller = client.post("/api/applications/apply", json=seller_payload)
    assert res_seller.status_code == 200, res_seller.text
    seller_app = res_seller.json()
    assert seller_app["status"] == "PENDING_APPROVAL"
    seller_app_id = seller_app["id"]

    # 2. Check seller status
    res_status = client.get("/api/applications/my-status?user_id=TEST_SELLER_99")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["has_application"] is True
    assert status_data["application"]["status"] == "PENDING_APPROVAL"

    # 3. Submit driver application
    driver_payload = {
        "user_id": "TEST_DRIVER_99",
        "name": "أحمد الإسكندراني",
        "phone": "01233334444",
        "role": "driver",
        "district": "Sidi Beshr",
        "application_data": {
            "national_id": "29801017654321",
            "vehicle_type": "pickup",
            "vehicle_plate": "س ق ب 4589",
            "license_number": "LIC-90812",
            "gps_consent_accepted": True
        }
    }
    res_driver = client.post("/api/applications/apply", json=driver_payload)
    assert res_driver.status_code == 200
    driver_app = res_driver.json()
    driver_app_id = driver_app["id"]

    # 4. Admin lists pending applications
    res_admin_apps = client.get("/api/admin/applications?status=PENDING_APPROVAL")
    assert res_admin_apps.status_code == 200
    admin_apps_data = res_admin_apps.json()
    assert admin_apps_data["count"] >= 2
    app_ids = [a["id"] for a in admin_apps_data["applications"]]
    assert seller_app_id in app_ids
    assert driver_app_id in app_ids

    # 5. Admin approves seller application
    res_review_seller = client.post(
        f"/api/admin/applications/{seller_app_id}/review",
        json={"action": "APPROVED", "notes": "تم فحص السجل التجاري والاعتماد بنجاح"}
    )
    assert res_review_seller.status_code == 200
    assert res_review_seller.json()["application"]["status"] == "APPROVED"

    # 6. Verify seller status is now APPROVED
    res_seller_status_after = client.get("/api/applications/my-status?user_id=TEST_SELLER_99")
    assert res_seller_status_after.json()["application"]["status"] == "APPROVED"

    # 7. Admin rejects driver or approves driver
    res_review_driver = client.post(
        f"/api/admin/applications/{driver_app_id}/review",
        json={"action": "APPROVED", "notes": "تم اعتماد رخصة القيادة والسيارة"}
    )
    assert res_review_driver.status_code == 200
    assert res_review_driver.json()["application"]["status"] == "APPROVED"


def test_driver_gps_streaming_and_live_tracking():
    # 1. Update driver location
    loc_payload = {
        "driver_id": "DRV-101",
        "driver_name": "كابتن أحمد الإسكندراني",
        "lat": 31.2250,
        "lng": 29.9550,
        "heading": 90.0,
        "sharing_enabled": True
    }
    res_loc = client.post("/api/driver/location", json=loc_payload)
    assert res_loc.status_code == 200
    assert res_loc.json()["status"] == "LOCATION_UPDATED"

    # 2. Get live tracking for a dispatch
    res_track = client.get("/api/dispatches/DISP-3001/live-tracking")
    assert res_track.status_code == 200
    track_data = res_track.json()
    assert "current_step" in track_data
    assert "pickup_coords" in track_data
    assert "delivery_coords" in track_data
    assert "calculated_eta_mins" in track_data
    assert track_data["pickup_coords"]["lat"] is not None

    # 3. Advance dispatch step
    res_step = client.post("/api/dispatches/DISP-3001/step", json={"step": "PICKED_UP"})
    assert res_step.status_code == 200
    assert res_step.json()["current_step"] == "PICKED_UP"


def test_admin_analytics_metrics():
    res_analytics = client.get("/api/admin/analytics")
    assert res_analytics.status_code == 200
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
