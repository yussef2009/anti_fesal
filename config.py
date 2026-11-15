"""
Anti-Fesal (آنتي فصال) - Central Configuration Module
Official Slogan: "سعّر، بيع، ومن غير وجع فصال"
Alexandria, Egypt Re-Commerce Platform
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if present
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# --- Core Business & AI Automation Constants ---
CONFIDENCE_THRESHOLD = 0.80  # >= 0.80 -> AUTO_APPROVED; < 0.80 -> PENDING_REVIEW (HITL)
COMMISSION = 0.08            # Default 8% for Everyday Sellers (C2B)
COMMISSION_PRO = 0.05        # 5% for Pro Traders
COMMISSION_ENTERPRISE = 0.03  # 3% for Enterprise Workshops

PURCHASE_PRICE_FACTOR = 0.72  # recommended_purchase_price = Resale * 0.72

# Grade condition multipliers against base market price
GRADE_MULTIPLIERS = {
    "A": 1.00,  # Like new / Pristine
    "B": 0.80,  # Minor cosmetic wear
    "C": 0.60,  # Noticeable defects/scratches
    "D": 0.35   # Heavy wear / Requires maintenance
}

# 14-day slow stock rule: 5% automatic markdown
SLOW_STOCK_DAYS = 14
SLOW_STOCK_DISCOUNT = 0.05

# Supported Alexandria Districts
ALEXANDRIA_DISTRICTS = [
    "El-Attarine",
    "El-Mansheya",
    "Sidi Beshr",
    "Moharam Bek",
    "Smouha",
    "Miami",
    "Loran",
    "Gleem",
    "Roushdy"
]

# Supported Categories
CATEGORIES = [
    "Appliances",
    "Electronics",
    "Furniture"
]

# --- File Paths ---
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
IMAGES_DIR = DATA_DIR / "images"

SQLITE_DB_PATH = DATA_DIR / "antifesal.db"
PRICE_MATRIX_CSV = DATA_DIR / "price_matrix_alexandria.csv"
TEST_DATASET_50_CSV = DATA_DIR / "test_dataset_50.csv"
RELIABILITY_TEST_100_CSV = DATA_DIR / "reliability_test_100.csv"
DAILY_CATALOG_MD = DATA_DIR / "daily_catalog.md"

AUTOMATION_LOG_CSV = LOGS_DIR / "automation_log.csv"
SKIPPED_ITEMS_LOG_CSV = LOGS_DIR / "skipped_items_log.csv"
CORRECTIONS_CSV = LOGS_DIR / "corrections.csv"

# Ensure runtime directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# --- External Cloud Service Configuration & Fallback Flags ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
MONGODB_URI = os.getenv("MONGODB_URI", "").strip()

APPWRITE_ENDPOINT = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1").strip()
APPWRITE_PROJECT_ID = os.getenv("APPWRITE_PROJECT_ID", "").strip()
APPWRITE_BUCKET_ID = os.getenv("APPWRITE_BUCKET_ID", "").strip()
APPWRITE_API_KEY = os.getenv("APPWRITE_API_KEY", "").strip()

CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY", "").strip()
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "").strip()
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "").strip()

DD_API_KEY = os.getenv("DD_API_KEY", "").strip()
DD_SITE = os.getenv("DD_SITE", "us5.datadoghq.com").strip()
DD_LLMOBS_ENABLED = os.getenv("DD_LLMOBS_ENABLED", "1").strip()
DD_LLMOBS_ML_APP = os.getenv("DD_LLMOBS_ML_APP", "anti-fesal").strip()

CUSTOM_DOMAIN = os.getenv("CUSTOM_DOMAIN", "anti-fesal.me").strip()
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "127.0.0.1")

# Convenience boolean flags
HAS_GEMINI = bool(GEMINI_API_KEY)
HAS_MONGODB = bool(MONGODB_URI)
HAS_APPWRITE = bool(APPWRITE_API_KEY and APPWRITE_PROJECT_ID and APPWRITE_BUCKET_ID)
HAS_CLERK = bool(CLERK_SECRET_KEY)
HAS_DATADOG = bool(DD_API_KEY)
