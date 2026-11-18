"""
Anti-Fesal (آنتي فصال) - Main FastAPI Application
Lead AI Architect Capstone - WE Applied Technology School, Alexandria, Egypt.
Slogan: "سعّر، بيع، ومن غير وجع فصال"
Features: 4 AI Agents, 3 Connected Workflows, Dual-Mode Storage, Clerk Auth / Dev Role Switcher,
Datadog APM / LLM Obs, and 3 Thread-Safe CSV Audit Loggers.
"""

import time
import os
import csv
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
import httpx
from jose import jwt as jose_jwt, JWTError

import sys
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import (
    CONFIDENCE_THRESHOLD, COMMISSION, COMMISSION_PRO, COMMISSION_ENTERPRISE,
    IMAGES_DIR, HAS_DATADOG, HAS_CLERK, HAS_GEMINI, HAS_MONGODB, HAS_APPWRITE,
    DD_API_KEY, DD_SITE, DD_LLMOBS_ENABLED, DD_LLMOBS_ML_APP,
    AUTOMATION_LOG_CSV, SKIPPED_ITEMS_LOG_CSV, CORRECTIONS_CSV, PRICE_MATRIX_CSV,
    CLERK_JWKS_URL
)
from backend.db_adapter import db
from backend.storage_adapter import storage
from backend.agents.visual_inspector import visual_inspector
from backend.agents.valuation_engine import valuation_engine
from backend.agents.dispatch_agent import dispatch_agent
from backend.agents.marketing_autoreply import marketing_autoreply
from backend.workflows.workflow_1_intake import workflow_intake
from backend.workflows.workflow_2_catalog_loop import workflow_catalog
from backend.workflows.workflow_3_settlement import workflow_settlement
from logs.logger import log_automation, log_correction, read_log_records

# --- Datadog ddtrace & LLM Observability Initialization ---
logger = logging.getLogger("anti_fesal.main")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

if HAS_DATADOG:
    try:
        from ddtrace import patch_all, tracer
        logging.getLogger("ddtrace.internal.writer.writer").setLevel(logging.CRITICAL)
        patch_all(fastapi=True)
        logger.info("Datadog APM & tracer successfully activated.")
    except Exception as e:
        logger.warning(f"Datadog ddtrace import error: {e}. Falling back to internal telemetry logging.")
else:
    logger.info("Datadog key not provided. Local telemetry logging active.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Anti-Fesal API (آنتي فصال)",
    description="Autonomous Multi-Agent Secondhand Re-Commerce & Merchant Automation Platform for Alexandria, Egypt",
    version="2.0.0"
)

ALLOWED_ORIGINS = [
    "https://anti-fesal.me",
    "https://www.anti-fesal.me",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "*"
]

# CORS middleware for local development and cloud deployments (Vercel / Cloudflare)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount local images directory for zero-downtime local storage fallback
app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

# Serve frontend static assets
FRONTEND_DIR = BASE_DIR / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_static")

# --- Authentication & Role Resolution Dependency ---
def get_current_user_role(
    authorization: Optional[str] = Header(None),
    x_dev_role: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Validates Clerk JWT via JWKS if configured, or falls back to built-in Dev Role Switcher
    (seller | merchant | driver | admin).
    """
    if HAS_CLERK and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        try:
            if CLERK_JWKS_URL:
                jwks_response = httpx.get(CLERK_JWKS_URL, timeout=5)
                if jwks_response.status_code == 200:
                    jwks = jwks_response.json()
                    payload = jose_jwt.decode(
                        token,
                        jwks,
                        algorithms=["RS256"],
                        options={"verify_aud": False}
                    )
                    role = payload.get("public_metadata", {}).get("role", "buyer")
                    return {"user_id": payload.get("sub", "clerk_user"), "role": role}
        except JWTError as e:
            logger.warning(f"Clerk JWT validation failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        except Exception as e:
            logger.warning(f"Clerk JWKS fetch/validation error: {e}. Falling back to dev role.")

    # Dev Role Switcher Fallback
    role = (x_dev_role or "merchant").lower().strip()
    if role not in ["seller", "merchant", "driver", "admin"]:
        role = "seller"
    return {"user_id": f"dev_{role}", "role": role}

# --- Pydantic Request Models ---
class IntakeRequest(BaseModel):
    title: str = Field(..., example="تلاجة توشيبا 16 قدم نوفروست")
    description: str = Field(..., example="تلاجة بحالة الزيرو استعمال خفيف جدا في سيدي بشر مفيهاش خربوش")
    district: str = Field(default="Sidi Beshr", example="Sidi Beshr")
    seller_phone: str = Field(default="01012345671", example="01012345671")
    seller_tier: str = Field(default="Everyday Seller", example="Everyday Seller")
    image_urls: List[str] = Field(default_factory=list)
    declared_category: Optional[str] = None
    seller_id: Optional[str] = None

class MerchantReviewRequest(BaseModel):
    action: str = Field(..., example="APPROVE")  # APPROVE, ADJUST, REJECT
    corrected_grade: Optional[str] = None
    corrected_price: Optional[float] = None
    merchant_notes: Optional[str] = None

class SettlementRequest(BaseModel):
    item_id: str = Field(..., example="AF-1001")
    buyer_id: str = Field(..., example="01234567890")
    agreed_price: Optional[float] = None
    pickup_address: Optional[str] = None
    simulate_dispatch_failure: bool = False

class AutoReplyRequest(BaseModel):
    item_id: str = Field(..., example="AF-1001")
    buyer_message: str = Field(..., example="ينفع تفاوض في السعر وتنزلي شوية؟")

class MarketingGenRequest(BaseModel):
    item_id: str = Field(..., example="AF-1001")

class DispatchStatusUpdateRequest(BaseModel):
    status: str = Field(..., example="COMPLETED")  # IN_TRANSIT, COMPLETED, CANCELLED

class UserStatusUpdateRequest(BaseModel):
    status: str = Field(..., example="BLOCKED")  # ACTIVE, BLOCKED

class DriverStatusUpdateRequest(BaseModel):
    status: str = Field(..., example="ON_DELIVERY")  # FREE, ON_DELIVERY, OFF_DUTY
    deal_id: Optional[str] = None

class ChatCompareRequest(BaseModel):
    message: str
    item_id_1: Optional[str] = None
    item_id_2: Optional[str] = None

class ApplicationRequest(BaseModel):
    role: str = Field(..., example="seller")  # seller or driver
    name: str = Field(..., example="أحمد محمود السكندري")
    phone: str = Field(..., example="01012345678")
    district: str = Field(..., example="Sidi Beshr")
    national_id: Optional[str] = None
    shop_name: Optional[str] = None
    business_type: Optional[str] = "individual"  # individual, workshop, showroom
    tier: Optional[str] = "Everyday Seller"
    vehicle_type: Optional[str] = None  # pickup, van, motorcycle
    vehicle_plate: Optional[str] = None
    license_number: Optional[str] = None
    coverage_districts: Optional[List[str]] = Field(default_factory=list)
    consent_location: bool = True

class ApplicationReviewRequest(BaseModel):
    action: str = Field(..., example="APPROVE")  # APPROVE, REJECT
    admin_notes: Optional[str] = None

class DriverLocationUpdateRequest(BaseModel):
    driver_id: str
    driver_name: Optional[str] = "كابتن الإسكندرية"
    lat: float
    lng: float
    heading: Optional[float] = 0.0
    sharing_enabled: bool = True

class DispatchStepUpdateRequest(BaseModel):
    step: str = Field(..., example="PICKED_UP")  # ORDER_PLACED, DRIVER_ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED_SETTLED
    driver_lat: Optional[float] = None
    driver_lng: Optional[float] = None

class LoginRequest(BaseModel):
    login_type: str = "standard"  # standard, google
    username_or_email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = "buyer"

class RegisterRequest(BaseModel):
    name: str
    username: str
    email: str
    password: str
    role: str = "buyer"
    district: str = "Sidi Beshr"
    phone: str = "01000000000"

# --- Health & Diagnostic Endpoint ---
@app.get("/api/health")
def get_health_status():
    """Returns pre-flight inspection status for all 6 external services and active fallbacks."""
    return {
        "status": "online",
        "platform": "Anti-Fesal (آنتي فصال) - Alexandria, Egypt",
        "slogan": "سعّر، بيع، ومن غير وجع فصال",
        "integrations": {
            "google_ai_studio_gemini": {"configured": HAS_GEMINI, "mode": "Cloud Gemini 1.5 Flash" if HAS_GEMINI else "Deterministic Offline AI Engine"},
            "mongodb_atlas": {"configured": HAS_MONGODB, "mode": "Cloud MongoDB Atlas" if HAS_MONGODB else "Embedded SQLite (data/antifesal.db)"},
            "appwrite_storage": {"configured": HAS_APPWRITE, "mode": "Appwrite Cloud Bucket" if HAS_APPWRITE else "Local Disk Mount (/images/)"},
            "clerk_auth": {"configured": HAS_CLERK, "mode": "Clerk Cloud JWT" if HAS_CLERK else "Active Dev Role Switcher (Seller/Merchant/Driver)"},
            "datadog_observability": {"configured": HAS_DATADOG, "mode": "Datadog US5 APM" if HAS_DATADOG else "Thread-Safe Local CSV Logger"},
            "custom_domain": {"domain": "anti-fesal.me", "status": "Ready for Namecheap DNS / Vercel"}
        },
        "db_mode": db.mode,
        "storage_mode": storage.mode,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

# --- Core Feed & Inventory Endpoints ---
@app.get("/api/items")
def get_items(
    category: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0, ge=0)
):
    """Returns listings with optional filtering by category, Alexandria district, status, or search query."""
    return db.get_items(category=category, district=district, status=status, search=search, limit=limit, offset=offset)

@app.get("/api/items/{item_id}")
def get_item(item_id: str):
    item = db.get_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

# --- File Upload Endpoint ---
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Uploads an image via Appwrite Storage or local fallback."""
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit")
    file_id, public_url = storage.save_image(contents, file.filename)
    return {"file_id": file_id, "url": public_url, "storage_mode": storage.mode}

# --- Workflow 1: Intake & Appraisal ---
@app.post("/api/intake")
def process_intake(req: IntakeRequest, user: Dict[str, Any] = Depends(get_current_user_role)):
    """Executes Workflow 1 (Agent 1 Visual Inspection + Agent 2 Valuation + Auto-Approval/HITL Triage)."""
    result = workflow_intake.process_intake(
        title=req.title,
        description=req.description,
        district=req.district,
        seller_phone=req.seller_phone,
        seller_tier=req.seller_tier,
        image_urls=req.image_urls,
        declared_category=req.declared_category,
        seller_id=req.seller_id or user.get("user_id")
    )
    return result

# --- View 3: Merchant Review (HITL) ---
@app.post("/api/review/{item_id}")
def review_item(item_id: str, req: MerchantReviewRequest, user: Dict[str, Any] = Depends(get_current_user_role)):
    """Human-In-The-Loop review for low-confidence (<0.80) items."""
    item = db.get_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    action = req.action.upper()
    if action == "APPROVE":
        db.update_item(item_id, {"status": "AUTO_APPROVED"})
        log_automation("MERCHANT_APPROVE", item_id, 0.0, "APPROVED", f"Approved by {user['user_id']}")
        return {"status": "AUTO_APPROVED", "message": "Item approved and published to showroom."}

    elif action == "ADJUST":
        corr_grade = req.corrected_grade or item.get("condition_grade", "B")
        corr_price = req.corrected_price or item.get("expected_resale_price", 0.0)
        notes = req.merchant_notes or "Merchant override"

        # Log to corrections.csv
        log_correction(
            item_id=item_id,
            original_grade=item.get("condition_grade", "Unknown"),
            corrected_grade=corr_grade,
            original_price=item.get("expected_resale_price", 0.0),
            corrected_price=corr_price,
            merchant_notes=notes,
            reviewer_id=user["user_id"]
        )

        db.update_item(item_id, {
            "status": "AUTO_APPROVED",
            "condition_grade": corr_grade,
            "expected_resale_price": corr_price,
            "recommended_purchase_price": round(corr_price * 0.72, 2)
        })

        log_automation("MERCHANT_ADJUST", item_id, 0.0, "ADJUSTED", f"Price: {corr_price}, Grade: {corr_grade}, Notes: {notes}")
        return {"status": "AUTO_APPROVED", "message": "Item adjusted and approved."}

    elif action == "REJECT":
        db.update_item(item_id, {"status": "REJECTED"})
        log_automation("MERCHANT_REJECT", item_id, 0.0, "REJECTED", req.merchant_notes or "Rejected by merchant")
        return {"status": "REJECTED", "message": "Item rejected."}

    raise HTTPException(status_code=400, detail="Invalid action")

# --- Workflow 3: Settlement & Driver Dispatch ---
@app.post("/api/settle")
def settle_deal(req: SettlementRequest):
    """Executes Workflow 3: locks commission, updates deal, and dispatches driver with 2-retry backoff."""
    try:
        result = workflow_settlement.close_deal_and_dispatch(
            item_id=req.item_id,
            buyer_id=req.buyer_id,
            agreed_price=req.agreed_price,
            pickup_address=req.pickup_address,
            simulate_dispatch_failure=req.simulate_dispatch_failure
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# --- Agent 4: Auto-Reply & Anti-Haggling ---
@app.post("/api/autoreply")
def autoreply_chat(req: AutoReplyRequest):
    """Agent 4 auto-reply: answers customer questions in <2s and politely deflects haggling."""
    item = db.get_item_by_id(req.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return marketing_autoreply.autoreply(item, req.buyer_message)

# --- Agent 4: Marketing Copy Generation ---
@app.post("/api/marketing/generate")
def generate_marketing(req: MarketingGenRequest):
    """Generates Facebook, Instagram, and WhatsApp social copy for an item."""
    item = db.get_item_by_id(req.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return marketing_autoreply.generate_ad_copy(item)

# --- Workflow 2: Daily Catalog Loop ---
@app.post("/api/catalog/run")
def run_daily_catalog():
    """Executes Workflow 2: compiles daily catalog and logs corrupt items to skipped_items_log.csv."""
    return workflow_catalog.run_catalog_generation()

# --- Dispatches List & Status ---
@app.get("/api/dispatches")
def get_dispatches(limit: int = 50):
    """Returns active driver dispatches."""
    return db.get_dispatches(limit=limit)

@app.post("/api/dispatches/{dispatch_id}/status")
def update_dispatch_status(dispatch_id: str, req: DispatchStatusUpdateRequest):
    success = db.update_dispatch(dispatch_id, {"status": req.status})
    if not success:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return {"status": req.status, "message": "Dispatch status updated"}

# --- Trader Rules & Subscription Tiers ---
@app.get("/api/trader-rules")
def get_trader_rules():
    return db.get_trader_rules()

# --- KPIs & Analytics ---
@app.get("/api/metrics")
def get_metrics():
    return db.get_metrics()

# --- Live Audit Log Tables ---
@app.get("/api/logs/automation")
def get_automation_logs(limit: int = 50):
    return read_log_records(AUTOMATION_LOG_CSV, limit=limit)

@app.get("/api/logs/skipped")
def get_skipped_logs(limit: int = 50):
    return read_log_records(SKIPPED_ITEMS_LOG_CSV, limit=limit)

@app.get("/api/logs/corrections")
def get_corrections_logs(limit: int = 50):
    return read_log_records(CORRECTIONS_CSV, limit=limit)

# --- Alexandria Secondhand Price Index ---
@app.get("/api/price-matrix")
def get_price_matrix(category: Optional[str] = Query(None), search: Optional[str] = Query(None)):
    """Returns Alexandria secondhand price matrix benchmarks with Grade A/B/C/D computed prices."""
    if not PRICE_MATRIX_CSV.exists():
        return []
    results = []
    with open(PRICE_MATRIX_CSV, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cat = row.get("category", "").strip()
            model = row.get("brand_model", "").strip()
            if category and category.lower() != "all" and cat.lower() != category.lower():
                continue
            if search:
                q = search.lower().strip()
                if q not in cat.lower() and q not in model.lower():
                    continue
            try:
                base_price = float(row.get("market_base_price_egp", 0))
            except ValueError:
                base_price = 0.0
            try:
                deprec = float(row.get("depreciation_rate_annual", 0.08))
            except ValueError:
                deprec = 0.08

            results.append({
                "category": cat,
                "brand_model": model,
                "market_base_price_egp": base_price,
                "depreciation_rate_annual": deprec,
                "min_grade_allowed": row.get("min_grade_allowed", "D").strip(),
                "grade_a_price": round(base_price * 1.00),
                "grade_b_price": round(base_price * 0.80),
                "grade_c_price": round(base_price * 0.60),
                "grade_d_price": round(base_price * 0.35),
            })
    return results

# --- Tracking Center: Deal & Dispatch Lookup ---
@app.get("/api/track/{query}")
def track_order(query: str):
    """Tracks a deal or dispatch by deal_id, item_id, driver name, or buyer phone."""
    q = query.strip()
    deals = db.get_deals(limit=100)
    dispatches = db.get_dispatches(limit=100)

    matched_deal = None
    for d in deals:
        if d.get("id") == q or d.get("item_id") == q or d.get("buyer_id") == q:
            matched_deal = d
            break

    matched_dispatch = None
    for disp in dispatches:
        if disp.get("id") == q or disp.get("item_id") == q or (matched_deal and disp.get("item_id") == matched_deal.get("item_id")):
            matched_dispatch = disp
            break

    if not matched_deal and not matched_dispatch:
        # Search by phone in dispatches
        for disp in dispatches:
            if disp.get("driver_phone") == q or q in disp.get("pickup_address", ""):
                matched_dispatch = disp
                break

    if not matched_deal and not matched_dispatch:
        raise HTTPException(status_code=404, detail="No matching order, deal, or dispatch found")

    item_id = (matched_deal.get("item_id") if matched_deal else None) or (matched_dispatch.get("item_id") if matched_dispatch else None)
    item = db.get_item_by_id(item_id) if item_id else None

    return {
        "found": True,
        "query": q,
        "deal": matched_deal,
        "dispatch": matched_dispatch,
        "item": item
    }

# --- Admin Portal: User Management ---
@app.get("/api/admin/users")
def get_admin_users():
    """Returns list of users for administration & moderation."""
    users = db.get_users()
    return {"users": users, "count": len(users)}

@app.post("/api/admin/users/{user_id}/status")
def update_user_status(user_id: str, req: UserStatusUpdateRequest):
    """Blocks or activates a user account."""
    success = db.update_user_status(user_id, req.status.upper())
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    log_automation("ADMIN_USER_STATUS", user_id, 0.0, req.status.upper(), f"Status updated to {req.status}")
    return {"status": req.status, "message": f"User status updated to {req.status}"}

# --- Admin Portal: Financials & Money Summary ---
@app.get("/api/admin/financials")
def get_admin_financials():
    """Returns platform GMV, commission revenues, driver cash payouts, and daily time series for graphs."""
    return db.get_financials_summary()

# --- Admin & Delivery Portal: Driver Fleet & Locations ---
@app.get("/api/admin/drivers")
def get_admin_drivers():
    """Returns driver fleet locations across Alexandria and current trip status."""
    drivers = db.get_drivers()
    return {"drivers": drivers, "count": len(drivers)}

@app.post("/api/admin/drivers/{driver_id}/status")
def update_driver_status(driver_id: str, req: DriverStatusUpdateRequest):
    """Updates driver status (FREE, ON_DELIVERY, OFF_DUTY)."""
    success = db.update_driver_status(driver_id, req.status.upper(), req.deal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"status": req.status, "message": f"Driver status updated to {req.status}"}

# --- Onboarding Applications: Seller & Driver Verification Desk ---
@app.post("/api/applications/apply")
def submit_application(req: ApplicationRequest, user: Dict[str, Any] = Depends(get_current_user_role)):
    """Submits a seller or delivery driver verification application."""
    user_id = user.get("user_id") or f"USR-{int(time.time()) % 10000}"
    app_data = {
        "user_id": user_id,
        "name": req.name,
        "phone": req.phone,
        "role": req.role.lower(),
        "district": req.district,
        "application_data": {
            "national_id": req.national_id,
            "shop_name": req.shop_name,
            "business_type": req.business_type,
            "tier": req.tier,
            "vehicle_type": req.vehicle_type,
            "vehicle_plate": req.vehicle_plate,
            "license_number": req.license_number,
            "coverage_districts": req.coverage_districts or [req.district],
            "consent_location": req.consent_location
        },
        "status": "PENDING_APPROVAL"
    }
    app_id = db.create_application(app_data)
    log_automation("APPLICATION_SUBMITTED", app_id, 0.0, "PENDING", f"Role: {req.role}, User: {req.name}")
    return {
        "success": True,
        "id": app_id,
        "application_id": app_id,
        "status": "PENDING_APPROVAL",
        "message": "تم استلام طلب التحقق بنجاح! سيقوم مسؤول النظام بمراجعته وتفعيل حسابك خلال دقائق."
    }

@app.get("/api/applications/my-status")
def get_my_application_status(user: Dict[str, Any] = Depends(get_current_user_role)):
    """Checks current user's seller or driver onboarding application status."""
    user_id = user.get("user_id")
    if not user_id:
        return {"has_application": False}
    app = db.get_application_by_user(user_id)
    if not app:
        return {"has_application": False}
    return {"has_application": True, "application": app}

@app.get("/api/admin/applications")
def get_admin_applications(status: Optional[str] = Query(None), role: Optional[str] = Query(None)):
    """Lists pending or reviewed seller & driver applications."""
    apps = db.get_applications(status=status, role=role, limit=100)
    return {"applications": apps, "count": len(apps)}

@app.post("/api/admin/applications/{app_id}/review")
def review_application(app_id: str, req: ApplicationReviewRequest):
    """Admin endpoint to approve or reject a seller/driver application."""
    status = "APPROVED" if req.action.upper() in ["APPROVE", "APPROVED"] else "REJECTED"
    success = db.review_application(app_id, status, req.admin_notes)
    if not success:
        raise HTTPException(status_code=404, detail="Application not found")
    log_automation("APPLICATION_REVIEW", app_id, 0.0, status, f"Decision: {status}, Notes: {req.admin_notes}")
    app_record = db.get_application_by_id(app_id) or {"id": app_id, "status": status}
    return {
        "status": status,
        "application": app_record,
        "message": f"تم {'قبول واعتماد' if status == 'APPROVED' else 'رفض'} الطلب بنجاح وتحديث صلاحيات المستخدم."
    }

# --- Real-time Driver GPS & Live Delivery Map Tracking ---
ALEXANDRIA_DISTRICT_COORDS = {
    "El-Attarine": {"lat": 31.1965, "lng": 29.9052},
    "El-Mansheya": {"lat": 31.2023, "lng": 29.8974},
    "Sidi Beshr": {"lat": 31.2652, "lng": 30.0051},
    "Moharam Bek": {"lat": 31.1884, "lng": 29.9205},
    "Smouha": {"lat": 31.2156, "lng": 29.9554},
    "Miami": {"lat": 31.2721, "lng": 30.0152},
    "Loran": {"lat": 31.2484, "lng": 29.9804},
    "Gleem": {"lat": 31.2405, "lng": 29.9702},
    "Roushdy": {"lat": 31.2301, "lng": 29.9508}
}

@app.post("/api/driver/location")
def update_driver_location(req: DriverLocationUpdateRequest):
    """Driver streams their real-time device GPS coordinates."""
    success = db.update_driver_location(
        driver_id=req.driver_id,
        driver_name=req.driver_name or "كابتن الإسكندرية",
        lat=req.lat,
        lng=req.lng,
        heading=req.heading or 0.0,
        sharing_enabled=req.sharing_enabled
    )
    return {"success": success, "status": "LOCATION_UPDATED", "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

@app.post("/api/dispatches/{dispatch_id}/step")
def update_dispatch_step(dispatch_id: str, req: DispatchStepUpdateRequest):
    """Updates the 5-step delivery road (ORDER_PLACED -> DRIVER_ASSIGNED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED_SETTLED)."""
    success = db.update_dispatch_step(dispatch_id, req.step, req.driver_lat, req.driver_lng)
    if not success:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    log_automation("DELIVERY_STEP_UPDATE", dispatch_id, 0.0, req.step, f"Step updated to {req.step}")
    return {
        "status": req.step,
        "current_step": req.step,
        "step_message": f"تم تحديث مرحلة الشحنة إلى: {req.step}",
        "message": f"تم تحديث مرحلة الشحنة إلى: {req.step}"
    }

@app.get("/api/dispatches/{dispatch_id}/live-tracking")
def get_live_dispatch_tracking(dispatch_id: str):
    """Returns live driver position, pickup/destination points, current step, and live ETA."""
    dispatches = db.get_dispatches(limit=100)
    matched = next((d for d in dispatches if d.get("id") == dispatch_id or d.get("deal_id") == dispatch_id or d.get("item_id") == dispatch_id), None)
    if not matched:
        raise HTTPException(status_code=404, detail="Dispatch record not found")

    item_id = matched.get("item_id")
    item = db.get_item_by_id(item_id) if item_id else None

    pickup_district = matched.get("district") or (item.get("district") if item else "El-Attarine")
    delivery_district = "Sidi Beshr" if pickup_district != "Sidi Beshr" else "Smouha"

    pickup_coords = ALEXANDRIA_DISTRICT_COORDS.get(pickup_district, {"lat": 31.1965, "lng": 29.9052})
    delivery_coords = ALEXANDRIA_DISTRICT_COORDS.get(delivery_district, {"lat": 31.2652, "lng": 30.0051})

    current_step = matched.get("current_step") or "DRIVER_ASSIGNED"
    
    # Calculate simulated or live driver coordinates between pickup and destination
    driver_lat = matched.get("driver_lat")
    driver_lng = matched.get("driver_lng")
    if driver_lat is None or driver_lng is None:
        # Interpolate realistic position based on current step
        if current_step == "ORDER_PLACED":
            driver_lat, driver_lng = pickup_coords["lat"], pickup_coords["lng"]
        elif current_step == "DRIVER_ASSIGNED":
            driver_lat = pickup_coords["lat"] - 0.005
            driver_lng = pickup_coords["lng"] - 0.005
        elif current_step == "PICKED_UP":
            driver_lat, driver_lng = pickup_coords["lat"], pickup_coords["lng"]
        elif current_step == "OUT_FOR_DELIVERY":
            driver_lat = (pickup_coords["lat"] + delivery_coords["lat"]) / 2
            driver_lng = (pickup_coords["lng"] + delivery_coords["lng"]) / 2
        else: # DELIVERED_SETTLED
            driver_lat, driver_lng = delivery_coords["lat"], delivery_coords["lng"]

    # Calculate distance & realistic Alexandria ETA
    import math
    dist_km = math.sqrt((driver_lat - delivery_coords["lat"])**2 + (driver_lng - delivery_coords["lng"])**2) * 111.0
    eta_minutes = max(5, int(dist_km * 3.5)) if current_step != "DELIVERED_SETTLED" else 0

    step_messages = {
        "ORDER_PLACED": "تم تأكيد الحجز وإخطار المندوب بالمعاينة.",
        "DRIVER_ASSIGNED": f"تم تعيين {matched.get('driver_name', 'الكابتن')} لمهمة الاستلام.",
        "PICKED_UP": f"الكابتن استلم السلعة من البائع وسلّمه الكاش الفوري — في الطريق للمعاينة!",
        "OUT_FOR_DELIVERY": f"الكابتن في نطاق حي {delivery_district} — متبقي {eta_minutes} دقيقة على الوصول.",
        "DELIVERED_SETTLED": "تمت المعاينة ودفع الكاش بنجاح وإغلاق الصفقة قطيعاً بدون فصال."
    }

    return {
        "dispatch_id": matched.get("id"),
        "deal_id": matched.get("deal_id"),
        "item_id": item_id,
        "item_title": item.get("title") if item else "سلعة معتمدة بالإسكندرية",
        "current_step": current_step,
        "step_message": step_messages.get(current_step, "الشحنة قيد المتابعة الحية"),
        "driver": {
            "name": matched.get("driver_name", "كابتن أحمد الإسكندراني"),
            "phone": matched.get("driver_phone", "01234567890"),
            "vehicle": matched.get("driver_vehicle", "فان بيك أب مجهز"),
            "lat": driver_lat,
            "lng": driver_lng
        },
        "locations": {
            "pickup": {
                "name": f"موقع الاستلام ({pickup_district})",
                "lat": pickup_coords["lat"],
                "lng": pickup_coords["lng"]
            },
            "delivery": {
                "name": f"عنوان المعاينة والتسليم ({delivery_district})",
                "lat": delivery_coords["lat"],
                "lng": delivery_coords["lng"]
            }
        },
        "pickup_coords": pickup_coords,
        "delivery_coords": delivery_coords,
        "driver_coords": {"lat": driver_lat, "lng": driver_lng},
        "eta_minutes": eta_minutes,
        "calculated_eta_mins": eta_minutes,
        "payout_cash": matched.get("payout_cash", 0.0)
    }

# --- Dedicated Admin Analytics Dashboard ---
@app.get("/api/admin/analytics")
def get_admin_analytics():
    """Returns analytics: sold count, top categories, top Alexandria districts, and platform revenue."""
    raw = db.get_admin_analytics()
    return {
        **raw,
        "orders_sold_count": raw.get("total_orders_sold", 0),
        "top_locations": raw.get("top_districts", []),
        "financials": {
            "gmv": raw.get("total_gmv", 0.0),
            "platform_net_commission": raw.get("platform_net_commission", 0.0),
            "driver_payouts": raw.get("driver_cash_payouts", 0.0)
        }
    }

# --- Auth: Login & Register ---
@app.post("/api/auth/login")
def auth_login(req: LoginRequest):
    """Handles standard or Google authentication."""
    if req.login_type == "google":
        return {
            "token": "tok_google_demo_123",
            "user": {
                "id": "USR-GOOGLE-1",
                "name": "مستخدم جوجل الإسكندراني",
                "username": "alex_google_user",
                "email": "user@gmail.com",
                "role": req.role or "buyer",
                "district": "Sidi Beshr",
                "status": "ACTIVE"
            }
        }

    # Standard email/username login
    identity = (req.username_or_email or "user").strip()
    users = db.get_users()
    matched = next((u for u in users if u["username"] == identity or u["email"] == identity), None)

    if not matched:
        # Create or mock user session
        role = req.role or "buyer"
        return {
            "token": f"tok_{identity}_456",
            "user": {
                "id": f"USR-{identity[:6].upper()}",
                "name": identity.split('@')[0],
                "username": identity.split('@')[0],
                "email": f"{identity}@example.com" if '@' not in identity else identity,
                "role": role,
                "district": "Smouha",
                "status": "ACTIVE"
            }
        }

    if matched.get("status") == "BLOCKED":
        raise HTTPException(status_code=403, detail="تم حظر هذا الحساب لمخالفة معايير الأمان وعدم الالتزام بالسعر القطعي.")

    return {
        "token": f"tok_{matched['id']}_session",
        "user": matched
    }

@app.post("/api/auth/register")
def auth_register(req: RegisterRequest):
    """Registers a new user into the platform database using the db adapter."""
    new_user_id = f"USR-{int(time.time()) % 10000}"
    new_user = {
        "id": new_user_id,
        "name": req.name,
        "username": req.username,
        "email": req.email,
        "role": req.role,
        "district": req.district,
        "phone": req.phone,
        "status": "ACTIVE",
        "orders_count": 0,
        "total_volume": 0.0,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    success = db.create_user(new_user)
    if not success:
        raise HTTPException(status_code=400, detail="اسم المستخدم أو البريد مسجل مسبقاً")

    return {
        "success": True,
        "user": {
            "id": new_user_id,
            "name": req.name,
            "username": req.username,
            "email": req.email,
            "role": req.role,
            "district": req.district
        }
    }

# --- Account Data Endpoint: Category-Specific Details ---
@app.get("/api/user/account-data")
def get_user_account_data(
    user_id: Optional[str] = Query(None),
    role: Optional[str] = Query("buyer"),
    user: Dict[str, Any] = Depends(get_current_user_role)
):
    """Returns role-specific profile information using authenticated user."""
    actual_user_id = user_id or user.get("user_id", "")
    items = db.get_items(limit=100)
    deals = db.get_deals(limit=100)
    dispatches = db.get_dispatches(limit=100)

    # 1. Seller items
    seller_items = [
        it for it in items
        if it.get("seller_id") == actual_user_id or (not it.get("seller_id") and it.get("seller_phone") == "01012345671")
    ][:5]
    if not seller_items:
        seller_items = [it for it in items if it.get("status") in ("AUTO_APPROVED", "PENDING_REVIEW")][:5]

    # 2. Buyer reservations
    buyer_deals = [d for d in deals if d.get("buyer_id") == actual_user_id][:4]
    if not buyer_deals:
        buyer_deals = deals[:4]

    # 3. Delivery driver trips
    driver_trips = [d for d in dispatches if d.get("driver_id") == actual_user_id][:6]
    if not driver_trips:
        driver_trips = dispatches[:6]

    return {
        "seller_data": {
            "items_count": len(seller_items),
            "total_buyout_payouts": sum(it.get("recommended_purchase_price", 0) for it in seller_items),
            "recent_items": seller_items
        },
        "buyer_data": {
            "active_reservations": len(buyer_deals),
            "total_spent": sum(d.get("agreed_price", 0) for d in buyer_deals),
            "recent_deals": buyer_deals
        },
        "delivery_data": {
            "completed_deliveries": len([d for d in driver_trips if d.get("status") == "COMPLETED"]),
            "cash_collected_today": sum(d.get("payout_cash", 0) for d in driver_trips),
            "recent_dispatches": driver_trips
        }
    }

# --- Quick Search & Compare Chatbot ---
@app.post("/api/chatbot/compare")
def chatbot_quick_search_and_compare(req: ChatCompareRequest):
    """AI Assistant for rapid product search and side-by-side comparison."""
    msg = req.message.lower().strip()
    all_items = db.get_items(limit=60)
    approved_items = [it for it in all_items if it.get("status") == "AUTO_APPROVED"]

    # Explicit 2-item comparison
    if req.item_id_1 and req.item_id_2:
        it1 = db.get_item_by_id(req.item_id_1)
        it2 = db.get_item_by_id(req.item_id_2)
        if it1 and it2:
            price_diff = abs(it1["expected_resale_price"] - it2["expected_resale_price"])
            cheaper = it1 if it1["expected_resale_price"] < it2["expected_resale_price"] else it2
            higher_grade = it1 if it1["condition_grade"] < it2["condition_grade"] else it2
            return {
                "type": "comparison",
                "item_1": it1,
                "item_2": it2,
                "price_diff": price_diff,
                "verdict_ar": f"الفرق بينهما {price_diff:,.0f} ج.م. السلعة ({cheaper['title']}) أرخص سعراً، بينما ({higher_grade['title']}) أعلى في درجة الفحص (Grade {higher_grade['condition_grade']}). كلاهما متاح للمعاينة فوراً بدون فصال.",
                "verdict_en": f"Price difference is {price_diff:,.0f} EGP. ({cheaper['title']}) is more affordable, whereas ({higher_grade['title']}) holds a higher condition grade (Grade {higher_grade['condition_grade']}). Both include full physical inspection before payment."
            }

    # Keyword comparison extraction (e.g. "قارن بين غسالة ال جي وتوشيبا")
    words = [w for w in msg.replace("قارن", "").replace("بين", "").replace("compare", "").replace("between", "").replace("and", "").replace("و", " ").split() if len(w) > 2]
    matched_candidates = []
    for it in approved_items:
        title_lower = it["title"].lower() + " " + (it.get("brand_model") or "").lower()
        if any(w in title_lower for w in words):
            matched_candidates.append(it)

    if len(matched_candidates) >= 2:
        it1 = matched_candidates[0]
        it2 = matched_candidates[1]
        price_diff = abs(it1["expected_resale_price"] - it2["expected_resale_price"])
        cheaper = it1 if it1["expected_resale_price"] < it2["expected_resale_price"] else it2
        return {
            "type": "comparison",
            "item_1": it1,
            "item_2": it2,
            "price_diff": price_diff,
            "verdict_ar": f"مقارنة ذكية في الإسكندرية:\n1. {it1['title']} بسعر {it1['expected_resale_price']:,.0f} ج.م (Grade {it1['condition_grade']})\n2. {it2['title']} بسعر {it2['expected_resale_price']:,.0f} ج.م (Grade {it2['condition_grade']})\nوفرق السعر {price_diff:,.0f} ج.م. يمكنك حجز أي منهما للمعاينة كاش عند باب البيت.",
            "verdict_en": f"Smart Comparison:\n1. {it1['title']} at {it1['expected_resale_price']:,.0f} EGP (Grade {it1['condition_grade']})\n2. {it2['title']} at {it2['expected_resale_price']:,.0f} EGP (Grade {it2['condition_grade']})\nDifference is {price_diff:,.0f} EGP. Both are verified with full inspection guarantee."
        }

    # Search recommendation fallback
    matching = [it for it in approved_items if any(w in it["title"].lower() or w in it["category"].lower() for w in words)][:4]
    if matching:
        return {
            "type": "search_results",
            "items": matching,
            "verdict_ar": f"وجدت لك {len(matching)} سلع مفحوصة مطابقة لبحثك في الإسكندرية بأسعار قطعية مدروسة.",
            "verdict_en": f"Found {len(matching)} verified items matching your query in Alexandria with fixed fair pricing."
        }

    # General help
    return {
        "type": "text",
        "verdict_ar": "أهلاً بك! أنا مساعد آنتي فصال الذكي للبحث والمقارنة السريعة. يمكنك أن تكتب لي مثلاً: 'قارن بين غسالة ال جي وزانوسي' أو 'شاشات أقل من 15000' وسأعطيك مقارنة دقيقة وفورية بالأسعار والدرجات!",
        "verdict_en": "Welcome! I am your Anti-Fesal AI Assistant for fast search and comparison. Try asking: 'compare LG and Zanussi washing machines' or 'TVs under 15000' for instant comparison!"
    }

# --- Serve Frontend Homepage ---
@app.get("/")
def serve_index():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Anti-Fesal Backend API is running."}

@app.get("/{path:path}")
def serve_frontend_files(path: str):
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail=f"API route '/{path}' not found")
    file_path = FRONTEND_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not Found")
