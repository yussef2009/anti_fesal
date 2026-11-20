"""
Anti-Fesal (آنتي فصال) - Database Initialization & Seed Script
Initializes the SQLite fallback database (data/antifesal.db) with production schema
and seeds reference records from the Alexandria test dataset.
"""

import sqlite3
import csv
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to sys.path so config is always importable
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import SQLITE_DB_PATH, TEST_DATASET_50_CSV, PRICE_MATRIX_CSV

def init_db():
    try:
        SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    conn = sqlite3.connect(str(SQLITE_DB_PATH))
    cursor = conn.cursor()

    # 1. items table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        brand_model TEXT,
        description TEXT,
        district TEXT NOT NULL,
        seller_phone TEXT,
        seller_tier TEXT DEFAULT 'Everyday Seller',
        image_urls TEXT,
        condition_grade TEXT,
        detected_defects TEXT,
        confidence_score REAL,
        expected_resale_price REAL,
        recommended_purchase_price REAL,
        commission_rate REAL DEFAULT 0.08,
        commission_amount REAL,
        status TEXT DEFAULT 'PENDING_REVIEW',
        created_at TEXT,
        updated_at TEXT,
        seller_id TEXT
    );
    """)

    # Ensure seller_id exists on already initialized databases
    try:
        cursor.execute("ALTER TABLE items ADD COLUMN seller_id TEXT")
    except sqlite3.OperationalError:
        pass

    # 2. deals table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS deals (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        seller_id TEXT,
        buyer_id TEXT,
        agreed_price REAL NOT NULL,
        commission_locked REAL NOT NULL,
        status TEXT DEFAULT 'OPEN',
        created_at TEXT,
        FOREIGN KEY (item_id) REFERENCES items (id)
    );
    """)

    # 3. dispatches table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dispatches (
        id TEXT PRIMARY KEY,
        deal_id TEXT,
        item_id TEXT NOT NULL,
        district TEXT NOT NULL,
        pickup_address TEXT,
        driver_name TEXT,
        driver_phone TEXT,
        payout_cash REAL,
        retry_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'PENDING',
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (item_id) REFERENCES items (id)
    );
    """)

    # 4. trader_rules table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS trader_rules (
        id TEXT PRIMARY KEY,
        trader_tier TEXT UNIQUE,
        commission_rate REAL,
        slow_stock_markdown_enabled INTEGER DEFAULT 1,
        slow_stock_days INTEGER DEFAULT 14,
        slow_stock_discount REAL DEFAULT 0.05,
        auto_reply_enabled INTEGER DEFAULT 1,
        anti_haggling_strictness TEXT DEFAULT 'polite_deflect'
    );
    """)

    # 5. users table (Admin User Management & Role Profiles)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        district TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        orders_count INTEGER DEFAULT 0,
        total_volume REAL DEFAULT 0.0,
        created_at TEXT
    );
    """)

    # 6. drivers table (Fleet Logistics & District Coverage)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS drivers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        district TEXT NOT NULL,
        status TEXT DEFAULT 'FREE',
        current_deal_id TEXT,
        vehicle_type TEXT,
        rating REAL DEFAULT 4.9,
        completed_trips INTEGER DEFAULT 0,
        updated_at TEXT
    );
    """)

    # 7. applications table (Seller & Driver Verification Desk)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL,
        district TEXT NOT NULL,
        application_data TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING_APPROVAL',
        admin_notes TEXT,
        created_at TEXT,
        reviewed_at TEXT
    );
    """)

    # 8. driver_locations table (Realtime GPS Coordinates)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS driver_locations (
        driver_id TEXT PRIMARY KEY,
        driver_name TEXT,
        lat REAL,
        lng REAL,
        heading REAL DEFAULT 0,
        sharing_enabled INTEGER DEFAULT 1,
        last_updated TEXT
    );
    """)

    # Upgrade existing dispatches table with realtime tracking columns if missing
    for col, col_type in [("current_step", "TEXT DEFAULT 'ORDER_PLACED'"), ("driver_lat", "REAL"), ("driver_lng", "REAL")]:
        try:
            cursor.execute(f"ALTER TABLE dispatches ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass

    conn.commit()

    # Seed trader rules if table is empty
    cursor.execute("SELECT COUNT(*) FROM trader_rules")
    if cursor.fetchone()[0] == 0:
        rules = [
            ("rule_everyday", "Everyday Seller", 0.08, 1, 14, 0.05, 1, "polite_deflect"),
            ("rule_pro", "Pro Trader", 0.05, 1, 14, 0.05, 1, "polite_deflect"),
            ("rule_enterprise", "Enterprise", 0.03, 1, 14, 0.05, 1, "polite_deflect")
        ]
        cursor.executemany("""
        INSERT INTO trader_rules (id, trader_tier, commission_rate, slow_stock_markdown_enabled, slow_stock_days, slow_stock_discount, auto_reply_enabled, anti_haggling_strictness)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, rules)
        conn.commit()

    # Seed items from test_dataset_50.csv if items table is empty
    cursor.execute("SELECT COUNT(*) FROM items")
    if cursor.fetchone()[0] == 0 and TEST_DATASET_50_CSV.exists():
        with open(TEST_DATASET_50_CSV, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            items_to_insert = []
            now = datetime.utcnow()
            for idx, row in enumerate(reader):
                # Spread creation dates to showcase slow stock rule (some > 14 days ago)
                days_ago = 16 if idx % 6 == 0 else (idx % 10)
                item_date = (now - timedelta(days=days_ago)).isoformat()
                
                conf = float(row.get("expected_confidence", 0.90))
                # Status based on confidence score threshold (0.80)
                status = "AUTO_APPROVED" if conf >= 0.80 else "PENDING_REVIEW"
                
                resale_price = float(row.get("expected_price_egp", 5000))
                purchase_price = round(resale_price * 0.72, 2)
                
                tier = row.get("seller_tier", "Everyday Seller")
                comm_rate = 0.08 if tier == "Everyday Seller" else (0.05 if tier == "Pro Trader" else 0.03)
                comm_amount = round(resale_price * comm_rate, 2)

                # Defects
                grade = row.get("condition_grade_ground_truth", "A")
                defects = []
                if grade == "B":
                    defects = ["خدوش سطحية خفيفة / Minor surface scuffs"]
                elif grade == "C":
                    defects = ["شرخ أو نقرة ملحوظة / Noticeable wear or chip"]
                elif grade == "D":
                    defects = ["بارومة أو كسر يحتاج صيانة / Structural wear, maintenance required"]

                items_to_insert.append((
                    row["item_id"],
                    row["title"],
                    row["category"],
                    row["brand_model"],
                    row["description"],
                    row["district"],
                    row.get("seller_phone", "01000000000"),
                    tier,
                    json.dumps([row.get("image_urls", "default.jpg")]),
                    grade,
                    json.dumps(defects),
                    conf,
                    resale_price,
                    purchase_price,
                    comm_rate,
                    comm_amount,
                    status,
                    item_date,
                    item_date
                ))

            cursor.executemany("""
            INSERT INTO items (
                id, title, category, brand_model, description, district, seller_phone, seller_tier,
                image_urls, condition_grade, detected_defects, confidence_score,
                expected_resale_price, recommended_purchase_price, commission_rate, commission_amount,
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, items_to_insert)
            conn.commit()

        # Seed sample deals and dispatches for demonstration
        cursor.execute("""
        INSERT OR IGNORE INTO deals (id, item_id, seller_id, buyer_id, agreed_price, commission_locked, status, created_at)
        VALUES ('DEAL-2001', 'AF-1001', '01012345671', '01299998888', 14500.0, 1160.0, 'COMMISSION_LOCKED', ?)
        """, (datetime.utcnow().isoformat(),))

        cursor.execute("""
        INSERT OR IGNORE INTO dispatches (id, deal_id, item_id, district, pickup_address, driver_name, driver_phone, payout_cash, retry_count, status, created_at, updated_at)
        VALUES ('DISP-3001', 'DEAL-2001', 'AF-1001', 'Sidi Beshr', 'شارع خالد بن الوليد، سيدي بشر، عمارة 14', 'كابتن أحمد الإسكندراني', '01234567890', 10440.0, 0, 'DISPATCH_SUCCESS', ?, ?)
        """, (datetime.utcnow().isoformat(), datetime.utcnow().isoformat()))
        conn.commit()

    # Seed users if users table is empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        sample_users = [
            ("USR-101", "محمود الإسكندراني", "mahmoud_alex", "mahmoud@gmail.com", "buyer", "Sidi Beshr", "01299998888", "ACTIVE", 4, 38500.0, datetime.utcnow().isoformat()),
            ("USR-102", "الحاج مصطفى العطار", "mostafa_attarine", "attarine_shop@gmail.com", "merchant", "El-Attarine", "01012345671", "ACTIVE", 18, 142000.0, datetime.utcnow().isoformat()),
            ("USR-103", "مروان النجار", "marwan_furniture", "marwan@alexwood.com", "seller", "Moharam Bek", "01155554444", "ACTIVE", 2, 28000.0, datetime.utcnow().isoformat()),
            ("USR-104", "سمير فتحي (مماطل)", "samir_haggler", "samir@yahoo.com", "buyer", "El-Mansheya", "01511112222", "BLOCKED", 0, 0.0, datetime.utcnow().isoformat()),
            ("USR-105", "كابتن طارق الديب", "tarek_driver", "tarek.deeb@antifesal.me", "driver", "Smouha", "01277778888", "ACTIVE", 64, 480000.0, datetime.utcnow().isoformat()),
            ("USR-106", "م. يوسف فكري (مدير النظام)", "admin_yussef", "admin@anti-fesal.me", "admin", "Loran", "01099990000", "ACTIVE", 0, 0.0, datetime.utcnow().isoformat())
        ]
        cursor.executemany("""
        INSERT INTO users (id, name, username, email, role, district, phone, status, orders_count, total_volume, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_users)
        conn.commit()

    # Seed drivers if drivers table is empty
    cursor.execute("SELECT COUNT(*) FROM drivers")
    if cursor.fetchone()[0] == 0:
        sample_drivers = [
            ("DRV-1", "كابتن أحمد الإسكندراني", "01234567890", "Sidi Beshr", "ON_DELIVERY", "DEAL-2001", "سيارة فان مغلقة", 4.9, 142, datetime.utcnow().isoformat()),
            ("DRV-2", "كابتن طارق الديب", "01277778888", "El-Attarine", "FREE", None, "تروسيكل بضائع مغلق", 4.8, 98, datetime.utcnow().isoformat()),
            ("DRV-3", "كابتن إسلام سموحة", "01044445555", "Smouha", "FREE", None, "سيارة جامبو مغلقة", 5.0, 210, datetime.utcnow().isoformat()),
            ("DRV-4", "كابتن وليد المنشية", "01188889999", "El-Mansheya", "ON_DELIVERY", "DEAL-2004", "تروسيكل كهربائي", 4.7, 76, datetime.utcnow().isoformat()),
            ("DRV-5", "كابتن كريم محرم بك", "01533334444", "Moharam Bek", "FREE", None, "سيارة فان مغلقة", 4.9, 115, datetime.utcnow().isoformat())
        ]
        cursor.executemany("""
        INSERT INTO drivers (id, name, phone, district, status, current_deal_id, vehicle_type, rating, completed_trips, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_drivers)
        conn.commit()

    conn.close()
    print(f"Successfully initialized and verified Anti-Fesal database at: {SQLITE_DB_PATH}")

if __name__ == "__main__":
    init_db()
