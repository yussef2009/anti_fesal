"""
Anti-Fesal (آنتي فصال) - Main FastAPI Application
Lead AI Architect Capstone - WE Applied Technology School, Alexandria, Egypt.
Slogan: "سعّر، بيع، ومن غير وجع فصال"
Features: 4 AI Agents, 3 Connected Workflows, Dual-Mode Storage, Clerk/HMAC Auth & RBAC,
Datadog APM / LLM Obs, and 3 Thread-Safe CSV Audit Loggers.
"""

import base64
import csv
import hashlib
import hmac
import json
import logging
import math
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt as jose_jwt
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import (
    ADMIN_ACCESS_PIN,
    AUTH_ENFORCE,
    AUTOMATION_LOG_CSV,
    CAPTAIN_ACCESS_PIN,
    CLERK_JWKS_URL,
    COMMISSION,
    CORRECTIONS_CSV,
    CUSTOM_DOMAIN,
    DD_API_KEY,
    DD_LLMOBS_ENABLED,
    DD_LLMOBS_ML_APP,
    DD_SITE,
    GEMINI_MODEL,
    HAS_APPWRITE,
    HAS_CLERK,
    HAS_DATADOG,
    HAS_GEMINI,
    HAS_MONGODB,
    IMAGES_DIR,
    PRICE_MATRIX_CSV,
    PURCHASE_PRICE_FACTOR,
    SESSION_SECRET,
    SKIPPED_ITEMS_LOG_CSV,
)
from data.init_db import hash_password, verify_password
from backend.db_adapter import db, normalize_phone
from backend.storage_adapter import storage
from backend.agents.marketing_autoreply import marketing_autoreply
from backend.workflows.workflow_1_intake import workflow_intake
from backend.workflows.workflow_2_catalog_loop import workflow_catalog
from backend.workflows.workflow_3_settlement import (
    ItemAlreadySettledError,
    infer_alexandria_district,
    workflow_settlement,
)
from logs.logger import log_automation, log_correction, read_log_records

# --- Datadog ddtrace & LLM Observability Initialization ---
logger = logging.getLogger("anti_fesal.main")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

if HAS_DATADOG:
    try:
        from ddtrace import patch_all

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
    version="2.0.0",
)

ALLOWED_ORIGINS = list(
    dict.fromkeys(
        [
            "https://anti-fesal.me",
            "https://www.anti-fesal.me",
            f"https://{CUSTOM_DOMAIN}" if CUSTOM_DOMAIN else "https://anti-fesal.me",
            "http://localhost:3000",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
            "http://127.0.0.1:5500",
            "http://localhost:5500",
        ]
    )
)

# CORS middleware for local development and cloud deployments (never combines "*" with allow_credentials=True)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount local images directory for zero-downtime local storage fallback
if not IMAGES_DIR.exists():
    try:
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
if IMAGES_DIR.exists():
    app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")

# Serve frontend static assets
FRONTEND_DIR = BASE_DIR / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend_static")

# --- Authentication, HMAC Session Tokens & RBAC ---
VALID_ROLES = ("buyer", "seller", "merchant", "driver", "admin")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(encoded: str) -> bytes:
    padding = "=" * ((4 - len(encoded) % 4) % 4)
    return base64.urlsafe_b64decode(encoded + padding)


def _create_session_token(
    user_id: str,
    role: str,
    username: str = "",
    ttl_seconds: int = 604800,
) -> str:
    """Creates a compact HMAC-SHA256 signed bearer token (payload_b64.sig_b64)."""
    clean_role = (role or "buyer").strip().lower()
    if clean_role not in VALID_ROLES:
        clean_role = "buyer"
    now = int(time.time())
    payload = {
        "sub": user_id,
        "role": clean_role,
        "username": username,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    body = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    sig = hmac.new(SESSION_SECRET.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{_b64url_encode(sig)}"


def _verify_session_token(token: str) -> Dict[str, Any]:
    """Verifies an HMAC-SHA256 signed bearer token and returns user claims."""
    try:
        body, sig_b64 = token.split(".", 1)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authentication token format")

    expected_sig = hmac.new(SESSION_SECRET.encode("utf-8"), body.encode("ascii"), hashlib.sha256).digest()
    try:
        provided_sig = _b64url_decode(sig_b64)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token signature encoding")

    if not hmac.compare_digest(expected_sig, provided_sig):
        raise HTTPException(status_code=401, detail="Invalid or tampered authentication token")

    try:
        claims = json.loads(_b64url_decode(body).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed authentication token payload")

    if not isinstance(claims, dict) or claims.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Authentication token has expired")

    role = str(claims.get("role", "buyer")).strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=401, detail="Invalid role claim in authentication token")

    user_id = str(claims.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing subject claim in authentication token")

    return {"user_id": user_id, "role": role, "authenticated": True}


def get_current_user_role(
    authorization: Optional[str] = Header(None),
    x_dev_role: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    Validates our HMAC-signed bearer tokens or Clerk JWT (when HAS_CLERK is enabled).
    Missing/anonymous requests ALWAYS default to role='buyer' (never 'merchant', never elevating 'buyer' to 'seller').
    X-Dev-Role is ONLY honored when AUTH_ENFORCE is explicitly '0'.
    """
    if authorization:
        if not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Invalid Authorization header scheme")
        token = authorization[7:].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Missing bearer token")

        # 2-part token -> our HMAC-SHA256 session token
        if token.count(".") == 1:
            return _verify_session_token(token)

        # 3-part token -> Clerk JWT if configured
        if HAS_CLERK and token.count(".") == 2:
            try:
                if not CLERK_JWKS_URL:
                    raise HTTPException(status_code=401, detail="Clerk JWKS URL not configured")
                jwks_response = httpx.get(CLERK_JWKS_URL, timeout=5)
                if jwks_response.status_code != 200:
                    raise HTTPException(status_code=401, detail="Failed to retrieve Clerk JWKS")
                jwks = jwks_response.json()
                payload = jose_jwt.decode(
                    token,
                    jwks,
                    algorithms=["RS256"],
                    options={"verify_aud": False},
                )
                role = str(payload.get("public_metadata", {}).get("role", "buyer")).strip().lower()
                if role not in VALID_ROLES:
                    role = "buyer"
                return {
                    "user_id": payload.get("sub", "clerk_user"),
                    "role": role,
                    "authenticated": True,
                }
            except JWTError as e:
                logger.warning(f"Clerk JWT validation failed: {e}")
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Clerk JWKS fetch/validation error: {e}")
                raise HTTPException(status_code=401, detail="Authentication verification failed")

        raise HTTPException(status_code=401, detail="Invalid or unsupported authentication token")

    # Dev Role Switcher ONLY when AUTH_ENFORCE is explicitly disabled ('0')
    if not AUTH_ENFORCE and x_dev_role:
        role = x_dev_role.lower().strip()
        if role not in VALID_ROLES:
            role = "buyer"
        return {"user_id": f"dev_{role}", "role": role, "authenticated": True}

    # Anonymous default: lowest-privilege public marketplace role
    return {"user_id": "anonymous", "role": "buyer", "authenticated": False}


def require_roles(*allowed_roles: str):
    """FastAPI dependency factory enforcing authentication and explicit RBAC role membership."""
    allowed = {r.lower() for r in allowed_roles}

    def _dependency(user: Dict[str, Any] = Depends(get_current_user_role)) -> Dict[str, Any]:
        if AUTH_ENFORCE and not user.get("authenticated"):
            raise HTTPException(status_code=401, detail="Authentication required")
        role = (user.get("role") or "buyer").lower()
        if role not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: requires role in [{', '.join(sorted(allowed))}]",
            )
        return user

    return _dependency


# --- Pydantic Request Models ---
class IntakeRequest(BaseModel):
    title: str = Field(..., json_schema_extra={"example": "تلاجة توشيبا 16 قدم نوفروست"})
    description: str = Field(..., json_schema_extra={"example": "تلاجة بحالة الزيرو استعمال خفيف جدا في سيدي بشر مفيهاش خربوش"})
    district: str = Field(default="Sidi Beshr", json_schema_extra={"example": "Sidi Beshr"})
    seller_phone: str = Field(default="01012345671", json_schema_extra={"example": "01012345671"})
    seller_tier: str = Field(default="Everyday Seller", json_schema_extra={"example": "Everyday Seller"})
    image_urls: List[str] = Field(default_factory=list)
    declared_category: Optional[str] = None
    seller_id: Optional[str] = None


class MerchantReviewRequest(BaseModel):
    action: str = Field(..., json_schema_extra={"example": "APPROVE"})  # APPROVE, ADJUST, REJECT
    corrected_grade: Optional[str] = None
    corrected_price: Optional[float] = None
    merchant_notes: Optional[str] = None


class SettlementRequest(BaseModel):
    item_id: str = Field(..., json_schema_extra={"example": "AF-1001"})
    buyer_id: str = Field(..., json_schema_extra={"example": "01234567890"})
    agreed_price: Optional[float] = None
    pickup_address: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_district: Optional[str] = None
    simulate_dispatch_failure: bool = False


class AutoReplyRequest(BaseModel):
    item_id: str = Field(..., json_schema_extra={"example": "AF-1001"})
    buyer_message: str = Field(..., json_schema_extra={"example": "ينفع تفاوض في السعر وتنزلي شوية؟"})


class MarketingGenRequest(BaseModel):
    item_id: str = Field(..., json_schema_extra={"example": "AF-1001"})


class DispatchStatusUpdateRequest(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "COMPLETED"})  # IN_TRANSIT, COMPLETED, CANCELLED


class UserStatusUpdateRequest(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "BLOCKED"})  # ACTIVE, BLOCKED


class DriverStatusUpdateRequest(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "ON_DELIVERY"})  # FREE, ON_DELIVERY, OFF_DUTY
    deal_id: Optional[str] = None


class ChatCompareRequest(BaseModel):
    message: str
    item_id_1: Optional[str] = None
    item_id_2: Optional[str] = None


class ApplicationRequest(BaseModel):
    user_id: Optional[str] = None
    role: str = Field(..., json_schema_extra={"example": "seller"})  # seller or driver
    name: str = Field(..., json_schema_extra={"example": "أحمد محمود السكندري"})
    phone: str = Field(..., json_schema_extra={"example": "01012345678"})
    district: str = Field(..., json_schema_extra={"example": "Sidi Beshr"})
    national_id: Optional[str] = None
    shop_name: Optional[str] = None
    business_type: Optional[str] = "individual"  # individual, workshop, showroom
    tier: Optional[str] = "Everyday Seller"
    payout_account: Optional[str] = None
    vehicle_type: Optional[str] = None  # pickup, van, motorcycle
    vehicle_plate: Optional[str] = None
    license_number: Optional[str] = None
    coverage_districts: Optional[List[str]] = Field(default_factory=list)
    consent_location: Optional[bool] = None
    application_data: Optional[Dict[str, Any]] = None


class ApplicationReviewRequest(BaseModel):
    action: str = Field(..., json_schema_extra={"example": "APPROVE"})  # APPROVE, REJECT
    admin_notes: Optional[str] = None
    notes: Optional[str] = None


class DriverLocationUpdateRequest(BaseModel):
    driver_id: str
    driver_name: Optional[str] = "كابتن الإسكندرية"
    lat: float
    lng: float
    heading: Optional[float] = 0.0
    sharing_enabled: bool = True


class DispatchStepUpdateRequest(BaseModel):
    step: str = Field(..., json_schema_extra={"example": "PICKED_UP"})
    driver_lat: Optional[float] = None
    driver_lng: Optional[float] = None


class LoginRequest(BaseModel):
    login_type: str = "standard"  # standard, google
    username_or_email: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = "buyer"
    is_google: Optional[bool] = False


class RegisterRequest(BaseModel):
    name: str
    username: str
    email: str
    password: str
    role: str = "buyer"
    district: str = "Sidi Beshr"
    phone: str = "01000000000"


class GateAuthRequest(BaseModel):
    portal: str = Field(..., json_schema_extra={"example": "captain"})  # captain | admin
    pin: str = Field(..., json_schema_extra={"example": ""})


# --- Health & Diagnostic Endpoint ---
@app.get("/api/health")
def get_health_status():
    """Returns pre-flight inspection status for all 6 external services and active fallbacks."""
    return {
        "status": "online",
        "platform": "Anti-Fesal (آنتي فصال) - Alexandria, Egypt",
        "slogan": "سعّر، بيع، ومن غير وجع فصال",
        "integrations": {
            "google_ai_studio_gemini": {
                "configured": HAS_GEMINI,
                "mode": f"Cloud Gemini ({GEMINI_MODEL})" if HAS_GEMINI else "Deterministic Offline AI Engine",
            },
            "mongodb_atlas": {
                "configured": HAS_MONGODB,
                "mode": "Cloud MongoDB Atlas" if HAS_MONGODB else "Embedded SQLite (data/antifesal.db)",
            },
            "appwrite_storage": {
                "configured": HAS_APPWRITE,
                "mode": "Appwrite Cloud Bucket" if HAS_APPWRITE else "Local Disk Mount (/images/)",
            },
            "clerk_auth": {
                "configured": HAS_CLERK,
                "mode": "Clerk Cloud JWT" if HAS_CLERK else "HMAC-SHA256 Session Auth",
            },
            "datadog_observability": {
                "configured": HAS_DATADOG,
                "mode": "Datadog US5 APM" if HAS_DATADOG else "Thread-Safe Local CSV Logger",
            },
            "custom_domain": {
                "domain": CUSTOM_DOMAIN or "anti-fesal.me",
                "status": "Ready for Namecheap DNS / Vercel",
            },
        },
        "auth_enforce": AUTH_ENFORCE,
        "db_mode": db.mode,
        "storage_mode": storage.mode,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


# --- Core Feed & Inventory Endpoints ---
@app.get("/api/items")
def get_items(
    category: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0, ge=0),
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
def process_intake(
    req: IntakeRequest,
    user: Dict[str, Any] = Depends(require_roles("seller", "merchant", "admin")),
):
    """Executes Workflow 1 (Agent 1 Visual Inspection + Agent 2 Valuation + Auto-Approval/HITL Triage)."""
    effective_seller_id = req.seller_id if (user.get("role") == "admin" and req.seller_id) else user.get("user_id")
    return workflow_intake.process_intake(
        title=req.title,
        description=req.description,
        district=req.district,
        seller_phone=req.seller_phone,
        seller_tier=req.seller_tier,
        image_urls=req.image_urls,
        declared_category=req.declared_category,
        seller_id=effective_seller_id,
    )


# --- View 3: Merchant Review (HITL) ---
@app.post("/api/review/{item_id}")
def review_item(
    item_id: str,
    req: MerchantReviewRequest,
    user: Dict[str, Any] = Depends(require_roles("merchant", "admin")),
):
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
        corr_grade = (req.corrected_grade or item.get("condition_grade") or "B").upper()
        corr_price = float(
            req.corrected_price if req.corrected_price is not None else (item.get("expected_resale_price") or 0.0)
        )
        comm_rate = float(item.get("commission_rate") if item.get("commission_rate") is not None else COMMISSION)
        corr_purchase_price = round(corr_price * PURCHASE_PRICE_FACTOR, 2)
        corr_commission_amount = round(corr_price * comm_rate, 2)
        notes = req.merchant_notes or "Merchant override"

        log_correction(
            item_id=item_id,
            original_grade=item.get("condition_grade", "Unknown"),
            corrected_grade=corr_grade,
            original_price=item.get("expected_resale_price", 0.0),
            corrected_price=corr_price,
            merchant_notes=notes,
            reviewer_id=user["user_id"],
        )

        db.update_item(
            item_id,
            {
                "status": "AUTO_APPROVED",
                "condition_grade": corr_grade,
                "expected_resale_price": corr_price,
                "recommended_purchase_price": corr_purchase_price,
                "commission_amount": corr_commission_amount,
            },
        )

        log_automation(
            "MERCHANT_ADJUST",
            item_id,
            0.0,
            "ADJUSTED",
            f"Price: {corr_price}, Grade: {corr_grade}, Comm: {corr_commission_amount}, Notes: {notes}",
        )
        return {
            "status": "AUTO_APPROVED",
            "message": "Item adjusted and approved.",
            "expected_resale_price": corr_price,
            "recommended_purchase_price": corr_purchase_price,
            "commission_amount": corr_commission_amount,
        }

    elif action == "REJECT":
        db.update_item(item_id, {"status": "REJECTED"})
        log_automation("MERCHANT_REJECT", item_id, 0.0, "REJECTED", req.merchant_notes or "Rejected by merchant")
        return {"status": "REJECTED", "message": "Item rejected."}

    raise HTTPException(status_code=400, detail="Invalid action")


# --- Workflow 3: Settlement & Driver Dispatch ---
@app.post("/api/settle")
def settle_deal(req: SettlementRequest):
    """Executes Workflow 3: guards double-settlement, locks commission, and dispatches driver."""
    try:
        return workflow_settlement.close_deal_and_dispatch(
            item_id=req.item_id,
            buyer_id=req.buyer_id,
            agreed_price=req.agreed_price,
            pickup_address=req.pickup_address,
            delivery_address=req.delivery_address,
            delivery_district=req.delivery_district,
            simulate_dispatch_failure=req.simulate_dispatch_failure,
        )
    except ItemAlreadySettledError as e:
        raise HTTPException(status_code=409, detail=str(e))
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
def run_daily_catalog(user: Dict[str, Any] = Depends(require_roles("merchant", "admin"))):
    """Executes Workflow 2: compiles daily catalog and logs corrupt items to skipped_items_log.csv."""
    return workflow_catalog.run_catalog_generation()


# --- Dispatches List & Status ---
@app.get("/api/dispatches")
def get_dispatches(limit: int = 50):
    """Returns active driver dispatches."""
    return db.get_dispatches(limit=limit)


@app.post("/api/dispatches/{dispatch_id}/status")
def update_dispatch_status(
    dispatch_id: str,
    req: DispatchStatusUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles("driver", "merchant", "admin")),
):
    status_upper = req.status.strip().upper()
    if status_upper not in ("PENDING", "DISPATCH_SUCCESS", "IN_TRANSIT", "COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=400, detail="Invalid dispatch status")

    fields: Dict[str, Any] = {"status": status_upper}
    if status_upper == "COMPLETED":
        fields["current_step"] = "DELIVERED_SETTLED"

    success = db.update_dispatch(dispatch_id, fields)
    if not success:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    if status_upper == "COMPLETED":
        disp = db.get_dispatch_by_ref(dispatch_id)
        if disp:
            if disp.get("deal_id"):
                db.update_deal(disp["deal_id"], {"status": "SETTLED"})
            if disp.get("item_id"):
                db.update_item(disp["item_id"], {"status": "SOLD"})

    return {"status": status_upper, "message": "Dispatch status updated"}


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
def get_automation_logs(
    limit: int = 50,
    user: Dict[str, Any] = Depends(require_roles("merchant", "admin")),
):
    return read_log_records(AUTOMATION_LOG_CSV, limit=limit)


@app.get("/api/logs/skipped")
def get_skipped_logs(
    limit: int = 50,
    user: Dict[str, Any] = Depends(require_roles("merchant", "admin")),
):
    return read_log_records(SKIPPED_ITEMS_LOG_CSV, limit=limit)


@app.get("/api/logs/corrections")
def get_corrections_logs(
    limit: int = 50,
    user: Dict[str, Any] = Depends(require_roles("merchant", "admin")),
):
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

            results.append(
                {
                    "category": cat,
                    "brand_model": model,
                    "market_base_price_egp": base_price,
                    "depreciation_rate_annual": deprec,
                    "min_grade_allowed": row.get("min_grade_allowed", "D").strip(),
                    "grade_a_price": round(base_price * 1.00),
                    "grade_b_price": round(base_price * 0.80),
                    "grade_c_price": round(base_price * 0.60),
                    "grade_d_price": round(base_price * 0.35),
                }
            )
    return results


# --- Tracking Center: Deal & Dispatch Lookup ---
@app.get("/api/track/{query}")
def track_order(query: str):
    """Tracks a deal or dispatch by exact deal/dispatch/item ID or normalized buyer/driver phone."""
    q = query.strip()
    matched_deal, matched_dispatch = db.find_tracking_records(q)

    if not matched_deal and not matched_dispatch:
        raise HTTPException(status_code=404, detail="No matching order, deal, or dispatch found")

    item_id = (matched_deal.get("item_id") if matched_deal else None) or (
        matched_dispatch.get("item_id") if matched_dispatch else None
    )
    item = db.get_item_by_id(item_id) if item_id else None

    return {
        "found": True,
        "query": q,
        "deal": matched_deal,
        "dispatch": matched_dispatch,
        "item": item,
    }


# --- Admin Portal: User Management ---
@app.get("/api/admin/users")
def get_admin_users(user: Dict[str, Any] = Depends(require_roles("admin"))):
    """Returns list of users for administration & moderation (password hashes omitted)."""
    users = db.get_users()
    return {"users": users, "count": len(users)}


@app.post("/api/admin/users/{user_id}/status")
def update_user_status(
    user_id: str,
    req: UserStatusUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles("admin")),
):
    """Blocks or activates a user account."""
    new_status = req.status.strip().upper()
    if new_status not in ("ACTIVE", "BLOCKED"):
        raise HTTPException(status_code=400, detail="Invalid user status; must be ACTIVE or BLOCKED")
    success = db.update_user_status(user_id, new_status)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    log_automation("ADMIN_USER_STATUS", user_id, 0.0, new_status, f"Status updated to {new_status}")
    return {"status": new_status, "message": f"User status updated to {new_status}"}


# --- Admin Portal: Financials & Money Summary ---
@app.get("/api/admin/financials")
def get_admin_financials(user: Dict[str, Any] = Depends(require_roles("admin"))):
    """Returns platform GMV, commission revenues, driver cash payouts, and daily time series for graphs."""
    return db.get_financials_summary()


# --- Admin & Delivery Portal: Driver Fleet & Locations ---
@app.get("/api/admin/drivers")
def get_admin_drivers(user: Dict[str, Any] = Depends(require_roles("admin"))):
    """Returns driver fleet locations across Alexandria and current trip status."""
    drivers = db.get_drivers()
    return {"drivers": drivers, "count": len(drivers)}


@app.post("/api/admin/drivers/{driver_id}/status")
def update_driver_status(
    driver_id: str,
    req: DriverStatusUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles("admin")),
):
    """Updates driver status (FREE, ON_DELIVERY, OFF_DUTY)."""
    new_status = req.status.strip().upper()
    if new_status not in ("FREE", "ON_DELIVERY", "OFF_DUTY"):
        raise HTTPException(status_code=400, detail="Invalid driver status")
    success = db.update_driver_status(driver_id, new_status, req.deal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"status": new_status, "message": f"Driver status updated to {new_status}"}


# --- Onboarding Applications: Seller & Driver Verification Desk ---
@app.post("/api/applications/apply")
def submit_application(
    req: ApplicationRequest,
    user: Dict[str, Any] = Depends(get_current_user_role),
):
    """Submits a seller or delivery driver verification application."""
    role = (req.role or "").strip().lower()
    if role not in ("seller", "driver"):
        raise HTTPException(status_code=400, detail="Role must be 'seller' or 'driver'")

    if user.get("authenticated") and user.get("role") != "admin":
        user_id = user.get("user_id")
    else:
        user_id = req.user_id or (user.get("user_id") if user.get("authenticated") else None) or f"USR-{uuid.uuid4().hex[:6].upper()}"

    app_details = req.application_data or {}

    national_id = req.national_id or app_details.get("national_id")
    shop_name = req.shop_name or app_details.get("shop_name")
    business_type = (
        req.business_type
        if req.business_type and req.business_type != "individual"
        else app_details.get("business_type", "individual")
    )
    tier = (
        req.tier
        if req.tier and req.tier != "Everyday Seller"
        else (app_details.get("tier") or req.tier or "Everyday Seller")
    )
    payout_account = (req.payout_account or app_details.get("payout_account") or "").strip()
    vehicle_type = req.vehicle_type or app_details.get("vehicle_type")
    vehicle_plate = req.vehicle_plate or app_details.get("vehicle_plate")
    license_number = req.license_number or app_details.get("license_number")
    coverage_districts = req.coverage_districts or app_details.get("coverage_districts") or [req.district]

    if "gps_consent_accepted" in app_details:
        consent_location = bool(app_details["gps_consent_accepted"])
    elif "consent_location" in app_details:
        consent_location = bool(app_details["consent_location"])
    elif req.consent_location is not None:
        consent_location = bool(req.consent_location)
    else:
        consent_location = False

    if role == "driver" and consent_location is not True:
        raise HTTPException(
            status_code=400,
            detail="GPS location consent (consent_location=True) is mandatory for driver onboarding.",
        )

    app_data = {
        "user_id": user_id,
        "name": req.name,
        "phone": req.phone,
        "role": role,
        "district": req.district,
        "application_data": {
            "national_id": national_id,
            "shop_name": shop_name,
            "business_type": business_type,
            "tier": tier,
            "payout_account": payout_account,
            "vehicle_type": vehicle_type,
            "vehicle_plate": vehicle_plate,
            "license_number": license_number,
            "coverage_districts": coverage_districts,
            "consent_location": consent_location,
        },
        "status": "PENDING_APPROVAL",
    }
    app_id = db.create_application(app_data)
    log_automation("APPLICATION_SUBMITTED", app_id, 0.0, "PENDING", f"Role: {role}, User: {req.name}")
    return {
        "success": True,
        "id": app_id,
        "application_id": app_id,
        "user_id": user_id,
        "status": "PENDING_APPROVAL",
        "message": "تم استلام طلب التحقق بنجاح! سيقوم مسؤول النظام بمراجعته وتفعيل حسابك خلال دقائق.",
    }


@app.get("/api/applications/my-status")
def get_my_application_status(
    user_id: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user_role),
):
    """Checks current user's seller or driver onboarding application status."""
    if user.get("authenticated"):
        actual_user_id = user_id if (user.get("role") == "admin" and user_id) else user.get("user_id")
    else:
        actual_user_id = user_id

    if not actual_user_id:
        return {"has_application": False}
    app_rec = db.get_application_by_user(actual_user_id)
    if not app_rec:
        return {"has_application": False}
    return {"has_application": True, "application": app_rec}


@app.get("/api/admin/applications")
def get_admin_applications(
    status: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_roles("admin")),
):
    """Lists pending or reviewed seller & driver applications."""
    apps = db.get_applications(status=status, role=role, limit=200)
    return {"applications": apps, "count": len(apps)}


@app.post("/api/admin/applications/{app_id}/review")
def review_application(
    app_id: str,
    req: ApplicationReviewRequest,
    user: Dict[str, Any] = Depends(require_roles("admin")),
):
    """Admin endpoint to approve or reject a seller/driver application."""
    status = "APPROVED" if req.action.upper() in ["APPROVE", "APPROVED"] else "REJECTED"
    notes = req.admin_notes or req.notes or ""
    success = db.review_application(app_id, status, notes)
    if not success:
        raise HTTPException(status_code=404, detail="Application not found")
    log_automation("APPLICATION_REVIEW", app_id, 0.0, status, f"Decision: {status}, Notes: {notes}")
    app_record = db.get_application_by_id(app_id) or {"id": app_id, "status": status}
    return {
        "status": status,
        "application": app_record,
        "message": f"تم {'قبول واعتماد' if status == 'APPROVED' else 'رفض'} الطلب بنجاح وتحديث صلاحيات المستخدم.",
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
    "Roushdy": {"lat": 31.2301, "lng": 29.9508},
}


@app.post("/api/driver/location")
def update_driver_location(
    req: DriverLocationUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles("driver", "admin")),
):
    """Driver streams their real-time device GPS coordinates."""
    success = db.update_driver_location(
        driver_id=req.driver_id,
        driver_name=req.driver_name or "كابتن الإسكندرية",
        lat=req.lat,
        lng=req.lng,
        heading=req.heading or 0.0,
        sharing_enabled=req.sharing_enabled,
    )
    return {
        "success": success,
        "status": "LOCATION_UPDATED",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.post("/api/dispatches/{dispatch_id}/step")
def update_dispatch_step(
    dispatch_id: str,
    req: DispatchStepUpdateRequest,
    user: Dict[str, Any] = Depends(require_roles("driver", "admin")),
):
    """Updates the 5-step delivery road (ORDER_PLACED -> DRIVER_ASSIGNED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED_SETTLED)."""
    step_upper = (req.step or "").strip().upper()
    valid_steps = ("ORDER_PLACED", "DRIVER_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED_SETTLED")
    if step_upper not in valid_steps:
        raise HTTPException(status_code=400, detail=f"Invalid step; must be one of {', '.join(valid_steps)}")

    success = db.update_dispatch_step(dispatch_id, step_upper, req.driver_lat, req.driver_lng)
    if not success:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    log_automation("DELIVERY_STEP_UPDATE", dispatch_id, 0.0, step_upper, f"Step updated to {step_upper}")
    return {
        "status": step_upper,
        "current_step": step_upper,
        "step_message": f"تم تحديث مرحلة الشحنة إلى: {step_upper}",
        "message": f"تم تحديث مرحلة الشحنة إلى: {step_upper}",
    }


def _resolve_live_driver_gps(matched: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Queries driver_locations for real-time streamed GPS coordinates."""
    driver_id = matched.get("driver_id")
    if driver_id:
        loc = db.get_driver_location(driver_id)
        if loc and loc.get("sharing_enabled") and loc.get("lat") is not None and loc.get("lng") is not None:
            return loc

    driver_phone = matched.get("driver_phone")
    driver_name = matched.get("driver_name")
    for drv in db.get_drivers():
        if (driver_phone and drv.get("phone") == driver_phone) or (
            driver_name and drv.get("name") == driver_name
        ):
            loc = db.get_driver_location(drv.get("id", ""))
            if loc and loc.get("sharing_enabled") and loc.get("lat") is not None and loc.get("lng") is not None:
                return loc

    if driver_name:
        loc = db.get_driver_location_by_name(driver_name)
        if loc and loc.get("sharing_enabled") and loc.get("lat") is not None and loc.get("lng") is not None:
            return loc

    return None


@app.get("/api/dispatches/{dispatch_id}/live-tracking")
def get_live_dispatch_tracking(dispatch_id: str):
    """Returns live driver position, pickup/destination points, current step, and live ETA."""
    matched = db.get_dispatch_by_ref(dispatch_id)
    if not matched:
        raise HTTPException(status_code=404, detail="Dispatch record not found")

    item_id = matched.get("item_id")
    item = db.get_item_by_id(item_id) if item_id else None

    pickup_district = matched.get("district") or (item.get("district") if item else None) or "El-Attarine"
    delivery_district = (
        matched.get("delivery_district")
        or infer_alexandria_district(matched.get("delivery_address"))
        or infer_alexandria_district(matched.get("pickup_address"))
        or pickup_district
    )

    pickup_address = matched.get("pickup_address") or f"موقع الاستلام ({pickup_district})"
    delivery_address = matched.get("delivery_address") or matched.get("pickup_address") or f"عنوان المعاينة والتسليم ({delivery_district})"

    pickup_coords = ALEXANDRIA_DISTRICT_COORDS.get(pickup_district, {"lat": 31.1965, "lng": 29.9052})
    delivery_coords = ALEXANDRIA_DISTRICT_COORDS.get(delivery_district, pickup_coords)

    if matched.get("status") == "COMPLETED":
        current_step = "DELIVERED_SETTLED"
    else:
        current_step = matched.get("current_step") or (
            "DRIVER_ASSIGNED"
            if matched.get("driver_name") and matched.get("driver_name") != "Pending Assignment"
            else "ORDER_PLACED"
        )

    # Resolve live GPS coordinates from driver_locations table first
    gps_live = False
    live_gps = _resolve_live_driver_gps(matched)
    driver_lat = matched.get("driver_lat")
    driver_lng = matched.get("driver_lng")

    if live_gps is not None:
        # Use live streamed GPS unless step endpoint explicitly recorded newer coordinates
        if driver_lat is not None and driver_lng is not None and (matched.get("updated_at") or "") > (live_gps.get("last_updated") or ""):
            gps_live = True
        else:
            driver_lat = float(live_gps["lat"])
            driver_lng = float(live_gps["lng"])
            gps_live = True

    if driver_lat is None or driver_lng is None:
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
        else:  # DELIVERED_SETTLED
            driver_lat, driver_lng = delivery_coords["lat"], delivery_coords["lng"]

    dist_km = math.sqrt((driver_lat - delivery_coords["lat"]) ** 2 + (driver_lng - delivery_coords["lng"]) ** 2) * 111.0
    eta_minutes = max(5, int(dist_km * 3.5)) if current_step != "DELIVERED_SETTLED" else 0

    step_messages = {
        "ORDER_PLACED": "تم تأكيد الحجز وإخطار المندوب بالمعاينة.",
        "DRIVER_ASSIGNED": f"تم تعيين {matched.get('driver_name', 'الكابتن')} لمهمة الاستلام.",
        "PICKED_UP": f"الكابتن استلم السلعة من البائع وسلّمه الكاش الفوري — في الطريق للمعاينة!",
        "OUT_FOR_DELIVERY": f"الكابتن في نطاق حي {delivery_district} — متبقي {eta_minutes} دقيقة على الوصول.",
        "DELIVERED_SETTLED": "تمت المعاينة ودفع الكاش بنجاح وإغلاق الصفقة قطيعاً بدون فصال.",
    }

    return {
        "dispatch_id": matched.get("id"),
        "deal_id": matched.get("deal_id"),
        "item_id": item_id,
        "item_title": item.get("title") if item else "سلعة معتمدة بالإسكندرية",
        "current_step": current_step,
        "step_message": step_messages.get(current_step, "الشحنة قيد المتابعة الحية"),
        "gps_live": gps_live,
        "pickup_district": pickup_district,
        "delivery_district": delivery_district,
        "pickup_address": pickup_address,
        "delivery_address": delivery_address,
        "driver": {
            "name": matched.get("driver_name", "كابتن أحمد الإسكندراني"),
            "phone": matched.get("driver_phone", "01234567890"),
            "vehicle": matched.get("driver_vehicle") or "فان بيك أب مجهز",
            "lat": driver_lat,
            "lng": driver_lng,
        },
        "locations": {
            "pickup": {
                "name": f"موقع الاستلام ({pickup_district})",
                "district": pickup_district,
                "address": pickup_address,
                "lat": pickup_coords["lat"],
                "lng": pickup_coords["lng"],
            },
            "delivery": {
                "name": f"عنوان المعاينة والتسليم ({delivery_district})",
                "district": delivery_district,
                "address": delivery_address,
                "lat": delivery_coords["lat"],
                "lng": delivery_coords["lng"],
            },
        },
        "pickup_coords": pickup_coords,
        "delivery_coords": delivery_coords,
        "driver_coords": {"lat": driver_lat, "lng": driver_lng},
        "eta_minutes": eta_minutes,
        "calculated_eta_mins": eta_minutes,
        "payout_cash": matched.get("payout_cash", 0.0),
    }


# --- Dedicated Admin Analytics Dashboard ---
@app.get("/api/admin/analytics")
def get_admin_analytics(user: Dict[str, Any] = Depends(require_roles("admin"))):
    """Returns live analytics: sold count, top categories, top Alexandria districts, and platform revenue."""
    raw = db.get_admin_analytics()
    return {
        **raw,
        "orders_sold_count": raw.get("total_orders_sold", 0),
        "top_locations": raw.get("top_districts", []),
        "financials": {
            "gmv": raw.get("total_gmv", 0.0),
            "platform_net_commission": raw.get("platform_net_commission", 0.0),
            "driver_payouts": raw.get("driver_cash_payouts", 0.0),
        },
    }


# --- Auth: Gate, Login & Register ---
@app.post("/api/auth/gate")
def auth_portal_gate(req: GateAuthRequest):
    """Validates Captain or Admin portal PIN server-side and returns an HMAC-signed bearer token."""
    portal = (req.portal or "").strip().lower()
    pin = (req.pin or "").strip()

    if portal == "captain":
        if not pin or not hmac.compare_digest(pin, CAPTAIN_ACCESS_PIN):
            raise HTTPException(status_code=401, detail="Invalid Captain portal PIN")
        token = _create_session_token(user_id="gate_captain", role="driver", username="captain_gate")
        return {"success": True, "token": token, "role": "driver", "user_id": "gate_captain"}

    if portal == "admin":
        if not pin or not hmac.compare_digest(pin, ADMIN_ACCESS_PIN):
            raise HTTPException(status_code=401, detail="Invalid Admin portal PIN")
        token = _create_session_token(user_id="gate_admin", role="admin", username="admin_gate")
        return {"success": True, "token": token, "role": "admin", "user_id": "gate_admin"}

    raise HTTPException(status_code=400, detail="Invalid portal; must be 'captain' or 'admin'")


@app.post("/api/auth/login")
def auth_login(req: LoginRequest):
    """Handles standard salted PBKDF2 login or explicit Google buyer demo toggle."""
    if req.login_type == "google" or req.is_google:
        demo_user = db.upsert_google_demo_user()
        if demo_user.get("status") == "BLOCKED":
            raise HTTPException(status_code=403, detail="تم حظر هذا الحساب لمخالفة معايير الأمان وعدم الالتزام بالسعر القطعي.")
        token = _create_session_token(
            user_id=demo_user["id"],
            role="buyer",
            username=demo_user.get("username", "alex_google_user"),
        )
        return {"token": token, "user": {**demo_user, "role": "buyer"}}

    identity = (req.username_or_email or req.username or req.email or "").strip()
    if not identity:
        raise HTTPException(status_code=400, detail="Username or email is required")

    matched = db.get_user_for_auth(identity)
    if not matched:
        raise HTTPException(status_code=401, detail="Invalid username/email or password")

    if matched.get("status") == "BLOCKED":
        raise HTTPException(status_code=403, detail="تم حظر هذا الحساب لمخالفة معايير الأمان وعدم الالتزام بالسعر القطعي.")

    stored_hash = matched.get("password_hash") or ""
    if stored_hash:
        if not req.password or not verify_password(req.password, stored_hash):
            raise HTTPException(status_code=401, detail="Invalid username/email or password")
    else:
        # Legacy seeded users without password_hash are only permitted when AUTH_ENFORCE is explicitly '0'
        if AUTH_ENFORCE:
            raise HTTPException(status_code=401, detail="Invalid username/email or password")

    clean_user = dict(matched)
    clean_user.pop("password_hash", None)
    clean_user.pop("_id", None)

    token = _create_session_token(
        user_id=clean_user["id"],
        role=clean_user.get("role", "buyer"),
        username=clean_user.get("username", ""),
    )
    return {"token": token, "user": clean_user}


@app.post("/api/auth/register")
def auth_register(req: RegisterRequest):
    """Registers a new buyer account with salted PBKDF2 password hashing and issues a signed token."""
    username = (req.username or "").strip()
    email = (req.email or "").strip()
    name = (req.name or "").strip()
    if not username or not email or not name:
        raise HTTPException(status_code=400, detail="Name, username, and email are required")
    if not req.password or len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    # Public signup ALWAYS forces role='buyer' (prevents self-assigned merchant/driver/admin escalation)
    forced_role = "buyer"
    new_user_id = f"USR-{uuid.uuid4().hex[:6].upper()}"
    new_user = {
        "id": new_user_id,
        "name": name,
        "username": username,
        "email": email,
        "role": forced_role,
        "district": req.district,
        "phone": req.phone,
        "password_hash": hash_password(req.password),
        "status": "ACTIVE",
        "orders_count": 0,
        "total_volume": 0.0,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    success = db.create_user(new_user)
    if not success:
        raise HTTPException(status_code=400, detail="اسم المستخدم أو البريد مسجل مسبقاً")

    token = _create_session_token(user_id=new_user_id, role=forced_role, username=username)
    return {
        "success": True,
        "token": token,
        "user": {
            "id": new_user_id,
            "name": name,
            "username": username,
            "email": email,
            "role": forced_role,
            "district": req.district,
            "phone": req.phone,
            "status": "ACTIVE",
        },
    }


# --- Account Data Endpoint: Strictly Scoped to Authenticated User ---
@app.get("/api/user/account-data")
def get_user_account_data(
    user_id: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(get_current_user_role),
):
    """Returns role-specific items, deals, and dispatches belonging ONLY to the authenticated user."""
    if AUTH_ENFORCE and not user.get("authenticated"):
        raise HTTPException(status_code=401, detail="Authentication required")

    actual_user_id = user_id if (user.get("role") == "admin" and user_id) else user.get("user_id", "")
    user_rec = db.get_user_by_id(actual_user_id)
    user_phone = normalize_phone(user_rec.get("phone")) if user_rec else ""

    items = db.get_items(limit=5000)
    deals = db.get_deals(limit=5000)
    dispatches = db.get_dispatches(limit=5000)

    # 1. Seller items (owned strictly by actual_user_id, or matching verified phone if unattributed legacy item)
    seller_items = [
        it
        for it in items
        if it.get("seller_id") == actual_user_id
        or (not it.get("seller_id") and user_phone and normalize_phone(it.get("seller_phone")) == user_phone)
    ]

    # 2. Buyer reservations (owned strictly by actual_user_id or verified phone)
    items_by_id = {it.get("id"): it for it in items}
    buyer_deals = []
    for d in deals:
        b_id = d.get("buyer_id") or ""
        if b_id == actual_user_id or (user_phone and normalize_phone(b_id) == user_phone):
            enriched = dict(d)
            if not enriched.get("item_title") and d.get("item_id") in items_by_id:
                enriched["item_title"] = items_by_id[d["item_id"]].get("title")
            buyer_deals.append(enriched)

    # 3. Delivery driver trips (owned strictly by actual_user_id or verified driver phone)
    driver_trips = [
        disp
        for disp in dispatches
        if disp.get("driver_id") == actual_user_id
        or (user_phone and normalize_phone(disp.get("driver_phone")) == user_phone)
    ]

    return {
        "user_id": actual_user_id,
        "role": role or user.get("role", "buyer"),
        "seller_data": {
            "items_count": len(seller_items),
            "total_buyout_payouts": round(sum(float(it.get("recommended_purchase_price") or 0) for it in seller_items), 2),
            "recent_items": seller_items[:20],
        },
        "buyer_data": {
            "active_reservations": len(buyer_deals),
            "total_spent": round(sum(float(d.get("agreed_price") or 0) for d in buyer_deals), 2),
            "recent_deals": buyer_deals[:20],
        },
        "delivery_data": {
            "completed_deliveries": len([d for d in driver_trips if d.get("status") == "COMPLETED"]),
            "cash_collected_today": round(sum(float(d.get("payout_cash") or 0) for d in driver_trips), 2),
            "recent_dispatches": driver_trips[:20],
        },
    }


# --- Quick Search & Compare Chatbot ---
_AR_CATEGORY_SYNONYMS = {
    "تلاجة": "appliances",
    "ثلاجة": "appliances",
    "غسالة": "appliances",
    "تكييف": "appliances",
    "بوتجاز": "appliances",
    "ميكروويف": "appliances",
    "شاشة": "electronics",
    "لابتوب": "electronics",
    "موبايل": "electronics",
    "ايفون": "electronics",
    "تليفون": "electronics",
    "بلايستيشن": "electronics",
    "صالون": "furniture",
    "سفرة": "furniture",
    "ركنة": "furniture",
    "نوم": "furniture",
    "مكتب": "furniture",
    "انتريه": "furniture",
}


def _extract_compare_keywords(msg: str) -> List[str]:
    stop = {"قارن", "بين", "مقارنة", "compare", "between", "and", "vs", "versus", "و", "أقل", "اقل", "من", "under", "below", "جنيه", "egp"}
    raw_tokens = re.findall(r"[\w\u0600-\u06FF]+", msg.lower())
    keywords: List[str] = []
    for tok in raw_tokens:
        if tok in stop or tok.isdigit():
            continue
        # Strip Arabic conjunction prefix "و" ONLY when the rest is a meaningful word (e.g. "وزانوسي" -> "زانوسي")
        if tok.startswith("و") and len(tok) >= 4:
            stripped = tok[1:]
            keywords.append(stripped)
        if len(tok) >= 2:
            keywords.append(tok)
    return list(dict.fromkeys(keywords))


@app.post("/api/chatbot/compare")
def chatbot_quick_search_and_compare(req: ChatCompareRequest):
    """AI Assistant for rapid product search and side-by-side comparison."""
    msg = (req.message or "").lower().strip()
    approved_items = db.get_items(status="AUTO_APPROVED", limit=200)

    # Explicit 2-item comparison
    if req.item_id_1 and req.item_id_2:
        it1 = db.get_item_by_id(req.item_id_1)
        it2 = db.get_item_by_id(req.item_id_2)
        if it1 and it2:
            p1 = float(it1.get("expected_resale_price") or 0)
            p2 = float(it2.get("expected_resale_price") or 0)
            price_diff = abs(p1 - p2)
            cheaper = it1 if p1 < p2 else it2
            g1 = (it1.get("condition_grade") or "D").upper()
            g2 = (it2.get("condition_grade") or "D").upper()
            higher_grade = it1 if g1 <= g2 else it2
            return {
                "type": "comparison",
                "item_1": it1,
                "item_2": it2,
                "items": [it1, it2],
                "price_diff": price_diff,
                "verdict_ar": (
                    f"الفرق بينهما {price_diff:,.0f} ج.م. السلعة ({cheaper['title']}) أرخص سعراً، "
                    f"بينما ({higher_grade['title']}) أعلى في درجة الفحص (Grade {higher_grade['condition_grade']}). "
                    f"كلاهما متاح للمعاينة فوراً بدون فصال."
                ),
                "verdict_en": (
                    f"Price difference is {price_diff:,.0f} EGP. ({cheaper['title']}) is more affordable, "
                    f"whereas ({higher_grade['title']}) holds a higher condition grade (Grade {higher_grade['condition_grade']}). "
                    f"Both include full physical inspection before payment."
                ),
            }

    # Optional price ceiling detection (e.g. "أقل من 15000" or "under 15000")
    max_price: Optional[float] = None
    price_match = re.search(r"(?:أقل من|اقل من|under|below|<)\s*(\d+)", msg)
    if price_match:
        max_price = float(price_match.group(1))

    words = _extract_compare_keywords(msg)

    def _item_searchable(it: Dict[str, Any]) -> str:
        return " ".join(
            [
                str(it.get("title") or ""),
                str(it.get("brand_model") or ""),
                str(it.get("category") or ""),
                str(it.get("description") or ""),
                str(it.get("district") or ""),
            ]
        ).lower()

    # Check if user asked a comparison query ("قارن" / "compare")
    is_compare_intent = any(k in msg for k in ("قارن", "مقارنة", "compare", " vs ", "versus"))

    matched_candidates = []
    for it in approved_items:
        price_val = float(it.get("expected_resale_price") or 0)
        if max_price is not None and price_val > max_price:
            continue
        blob = _item_searchable(it)
        cat_lower = (it.get("category") or "").lower()
        word_hit = any(
            w in blob or (_AR_CATEGORY_SYNONYMS.get(w) == cat_lower)
            for w in words
        )
        if word_hit or (max_price is not None and not words):
            matched_candidates.append(it)

    if is_compare_intent and len(matched_candidates) >= 2:
        it1, it2 = matched_candidates[0], matched_candidates[1]
        price_diff = abs(float(it1["expected_resale_price"]) - float(it2["expected_resale_price"]))
        return {
            "type": "comparison",
            "item_1": it1,
            "item_2": it2,
            "items": [it1, it2],
            "price_diff": price_diff,
            "verdict_ar": (
                f"مقارنة ذكية في الإسكندرية:\n"
                f"1. {it1['title']} بسعر {it1['expected_resale_price']:,.0f} ج.م (Grade {it1['condition_grade']})\n"
                f"2. {it2['title']} بسعر {it2['expected_resale_price']:,.0f} ج.م (Grade {it2['condition_grade']})\n"
                f"وفرق السعر {price_diff:,.0f} ج.م. يمكنك حجز أي منهما للمعاينة كاش عند باب البيت."
            ),
            "verdict_en": (
                f"Smart Comparison:\n"
                f"1. {it1['title']} at {it1['expected_resale_price']:,.0f} EGP (Grade {it1['condition_grade']})\n"
                f"2. {it2['title']} at {it2['expected_resale_price']:,.0f} EGP (Grade {it2['condition_grade']})\n"
                f"Difference is {price_diff:,.0f} EGP. Both are verified with full inspection guarantee."
            ),
        }

    if matched_candidates:
        top_matches = matched_candidates[:4]
        return {
            "type": "search_results",
            "items": top_matches,
            "verdict_ar": f"وجدت لك {len(top_matches)} سلع مفحوصة مطابقة لبحثك في الإسكندرية بأسعار قطعية مدروسة.",
            "verdict_en": f"Found {len(top_matches)} verified items matching your query in Alexandria with fixed fair pricing.",
        }

    return {
        "type": "text",
        "items": [],
        "verdict_ar": "أهلاً بك! أنا مساعد آنتي فصال الذكي للبحث والمقارنة السريعة. يمكنك أن تكتب لي مثلاً: 'قارن بين غسالة ال جي وزانوسي' أو 'شاشات أقل من 15000' وسأعطيك مقارنة دقيقة وفورية بالأسعار والدرجات!",
        "verdict_en": "Welcome! I am your Anti-Fesal AI Assistant for fast search and comparison. Try asking: 'compare LG and Zanussi washing machines' or 'TVs under 15000' for instant comparison!",
    }


# --- Serve Frontend Homepage (Guarded Against Path Traversal) ---
@app.get("/")
def serve_index():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "Anti-Fesal Backend API is running."}


@app.get("/{path:path}")
def serve_frontend_files(path: str):
    if path == "api" or path.startswith("api/"):
        raise HTTPException(status_code=404, detail=f"API route '/{path}' not found")
    frontend_root = FRONTEND_DIR.resolve()
    try:
        file_path = (frontend_root / path).resolve()
    except (ValueError, RuntimeError):
        raise HTTPException(status_code=404, detail="Not Found")

    if not file_path.is_relative_to(frontend_root):
        raise HTTPException(status_code=403, detail="Access denied")

    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    index_file = frontend_root / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Not Found")
