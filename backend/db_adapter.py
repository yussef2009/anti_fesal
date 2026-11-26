"""
Anti-Fesal (آنتي فصال) - Dual-Mode Database Adapter
Seamlessly switches between MongoDB Atlas and SQLite fallback (data/antifesal.db)
with identical unified CRUD contracts and zero downtime.
"""

import json
import logging
import re
import sqlite3
import sys
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import MONGODB_URI, SQLITE_DB_PATH, HAS_MONGODB
from data.init_db import init_db, hash_password, verify_password

logger = logging.getLogger("anti_fesal.db_adapter")
_sqlite_lock = threading.Lock()


def normalize_phone(raw: Optional[str]) -> str:
    """Normalizes Egyptian/international phone strings to local 01xxxxxxxxx digits when >= 10 digits."""
    if not raw:
        return ""
    digits = re.sub(r"\D", "", str(raw))
    if digits.startswith("0020"):
        digits = "0" + digits[4:]
    elif digits.startswith("20") and len(digits) >= 11:
        digits = "0" + digits[2:]
    return digits if len(digits) >= 10 else ""


def _sanitize_user(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    clean = dict(doc)
    clean.pop("_id", None)
    clean.pop("password_hash", None)
    return clean


class DatabaseAdapter:
    def __init__(self):
        self.mode = "sqlite"
        self.mongo_client = None
        self.mongo_db = None

        if HAS_MONGODB:
            try:
                import pymongo
                self.mongo_client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
                self.mongo_client.admin.command("ping")
                self.mongo_db = self.mongo_client.get_database("antifesal")
                self.mode = "mongodb"
                logger.info("Connected successfully to MongoDB Atlas cloud cluster.")
            except Exception as e:
                logger.warning(f"MongoDB Atlas connection failed: {e}. Falling back to SQLite.")
                self.mode = "sqlite"

        if self.mode == "sqlite":
            if not SQLITE_DB_PATH.exists():
                init_db()
            self._migrate_sqlite_schema()

    def _get_sqlite_conn(self):
        conn = sqlite3.connect(str(SQLITE_DB_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _migrate_sqlite_schema(self):
        """Ensures existing SQLite databases have all required columns added via ALTER TABLE."""
        migrations = [
            ("items", "seller_id", "TEXT"),
            ("users", "password_hash", "TEXT"),
            ("dispatches", "current_step", "TEXT DEFAULT 'ORDER_PLACED'"),
            ("dispatches", "driver_lat", "REAL"),
            ("dispatches", "driver_lng", "REAL"),
            ("dispatches", "delivery_address", "TEXT"),
            ("dispatches", "delivery_district", "TEXT"),
            ("dispatches", "driver_id", "TEXT"),
            ("dispatches", "driver_vehicle", "TEXT"),
        ]
        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            for table, col, col_type in migrations:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
                except sqlite3.OperationalError:
                    pass
            conn.commit()
            conn.close()

    # ------------------ Items Operations ------------------
    def get_items(
        self,
        category: Optional[str] = None,
        district: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        if self.mode == "mongodb":
            query: Dict[str, Any] = {}
            if category and category != "All":
                query["category"] = category
            if district and district != "All":
                query["district"] = district
            if status and status != "All":
                query["status"] = status
            if search:
                query["$or"] = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                    {"brand_model": {"$regex": search, "$options": "i"}},
                ]
            cursor = self.mongo_db.items.find(query).sort("created_at", -1).skip(offset).limit(limit)
            items = []
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                items.append(doc)
            return items

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            conditions = []
            params: List[Any] = []
            if category and category != "All":
                conditions.append("category = ?")
                params.append(category)
            if district and district != "All":
                conditions.append("district = ?")
                params.append(district)
            if status and status != "All":
                conditions.append("status = ?")
                params.append(status)
            if search:
                conditions.append("(title LIKE ? OR description LIKE ? OR brand_model LIKE ?)")
                wildcard = f"%{search}%"
                params.extend([wildcard, wildcard, wildcard])

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            sql = f"SELECT * FROM items{where_clause} ORDER BY created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            items = []
            for row in rows:
                item = dict(row)
                try:
                    item["image_urls"] = json.loads(item["image_urls"]) if item.get("image_urls") else []
                except Exception:
                    item["image_urls"] = [item["image_urls"]] if item.get("image_urls") else []
                try:
                    item["detected_defects"] = json.loads(item["detected_defects"]) if item.get("detected_defects") else []
                except Exception:
                    item["detected_defects"] = []
                items.append(item)
            conn.close()
            return items

    def count_items(
        self,
        category: Optional[str] = None,
        district: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> int:
        if self.mode == "mongodb":
            query: Dict[str, Any] = {}
            if category and category != "All":
                query["category"] = category
            if district and district != "All":
                query["district"] = district
            if status and status != "All":
                query["status"] = status
            if search:
                query["$or"] = [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                    {"brand_model": {"$regex": search, "$options": "i"}},
                ]
            return self.mongo_db.items.count_documents(query)

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            conditions = []
            params: List[Any] = []
            if category and category != "All":
                conditions.append("category = ?")
                params.append(category)
            if district and district != "All":
                conditions.append("district = ?")
                params.append(district)
            if status and status != "All":
                conditions.append("status = ?")
                params.append(status)
            if search:
                conditions.append("(title LIKE ? OR description LIKE ? OR brand_model LIKE ?)")
                wildcard = f"%{search}%"
                params.extend([wildcard, wildcard, wildcard])

            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            sql = f"SELECT COUNT(*) FROM items{where_clause}"
            cursor = conn.cursor()
            cursor.execute(sql, params)
            count = cursor.fetchone()[0]
            conn.close()
            return count

    def get_item_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        if self.mode == "mongodb":
            doc = self.mongo_db.items.find_one({"id": item_id})
            if doc:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
            return doc

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
            row = cursor.fetchone()
            conn.close()
            if not row:
                return None
            item = dict(row)
            try:
                item["image_urls"] = json.loads(item["image_urls"]) if item.get("image_urls") else []
            except Exception:
                item["image_urls"] = [item["image_urls"]] if item.get("image_urls") else []
            try:
                item["detected_defects"] = json.loads(item["detected_defects"]) if item.get("detected_defects") else []
            except Exception:
                item["detected_defects"] = []
            return item

    def insert_item(self, item: Dict[str, Any]) -> str:
        item["created_at"] = item.get("created_at") or datetime.utcnow().isoformat()
        item["updated_at"] = datetime.utcnow().isoformat()

        if self.mode == "mongodb":
            doc = dict(item)
            self.mongo_db.items.insert_one(doc)
            return item["id"]

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            img_urls = json.dumps(item.get("image_urls", [])) if isinstance(item.get("image_urls"), list) else item.get("image_urls", "[]")
            defects = json.dumps(item.get("detected_defects", [])) if isinstance(item.get("detected_defects"), list) else item.get("detected_defects", "[]")

            cursor.execute(
                """
                INSERT OR REPLACE INTO items (
                    id, title, category, brand_model, description, district, seller_phone, seller_tier,
                    image_urls, condition_grade, detected_defects, confidence_score,
                    expected_resale_price, recommended_purchase_price, commission_rate, commission_amount,
                    status, created_at, updated_at, seller_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["id"],
                    item.get("title", ""),
                    item.get("category", ""),
                    item.get("brand_model", ""),
                    item.get("description", ""),
                    item.get("district", "El-Attarine"),
                    item.get("seller_phone", ""),
                    item.get("seller_tier", "Everyday Seller"),
                    img_urls,
                    item.get("condition_grade", "B"),
                    defects,
                    item.get("confidence_score", 0.85),
                    item.get("expected_resale_price", 0.0),
                    item.get("recommended_purchase_price", 0.0),
                    item.get("commission_rate", 0.08),
                    item.get("commission_amount", 0.0),
                    item.get("status", "PENDING_REVIEW"),
                    item["created_at"],
                    item["updated_at"],
                    item.get("seller_id", ""),
                ),
            )
            conn.commit()
            conn.close()
            return item["id"]

    def update_item(self, item_id: str, fields: Dict[str, Any]) -> bool:
        fields = dict(fields)
        fields["updated_at"] = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            res = self.mongo_db.items.update_one({"id": item_id}, {"$set": fields})
            return res.matched_count > 0

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            set_clauses = []
            params = []
            for k, v in fields.items():
                if k in ("image_urls", "detected_defects") and isinstance(v, (list, dict)):
                    v = json.dumps(v)
                set_clauses.append(f"{k} = ?")
                params.append(v)
            params.append(item_id)
            sql = f"UPDATE items SET {', '.join(set_clauses)} WHERE id = ?"
            cursor.execute(sql, params)
            conn.commit()
            updated = cursor.rowcount > 0
            conn.close()
            return updated

    def claim_item_for_settlement(self, item_id: str) -> bool:
        """Atomically transitions an available item to DISPATCHED, preventing double-settlement."""
        now = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            res = self.mongo_db.items.update_one(
                {"id": item_id, "status": {"$nin": ["DISPATCHED", "SOLD", "REJECTED"]}},
                {"$set": {"status": "DISPATCHED", "updated_at": now}},
            )
            return res.matched_count > 0

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE items
                SET status = 'DISPATCHED', updated_at = ?
                WHERE id = ? AND status NOT IN ('DISPATCHED', 'SOLD', 'REJECTED')
                """,
                (now, item_id),
            )
            conn.commit()
            claimed = cursor.rowcount > 0
            conn.close()
            return claimed

    # ------------------ Deals Operations ------------------
    def get_deals(self, limit: int = 50) -> List[Dict[str, Any]]:
        if self.mode == "mongodb":
            cursor = self.mongo_db.deals.find().sort("created_at", -1).limit(limit)
            deals = []
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                deals.append(doc)
            return deals

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM deals ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            deals = [dict(r) for r in rows]
            conn.close()
            return deals

    def insert_deal(self, deal: Dict[str, Any]) -> str:
        deal["created_at"] = deal.get("created_at") or datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            self.mongo_db.deals.insert_one(dict(deal))
            return deal["id"]

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO deals (id, item_id, seller_id, buyer_id, agreed_price, commission_locked, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    deal["id"],
                    deal["item_id"],
                    deal.get("seller_id", ""),
                    deal.get("buyer_id", ""),
                    float(deal["agreed_price"]),
                    float(deal["commission_locked"]),
                    deal.get("status", "OPEN"),
                    deal["created_at"],
                ),
            )
            conn.commit()
            conn.close()
            return deal["id"]

    def update_deal(self, deal_id: str, fields: Dict[str, Any]) -> bool:
        if self.mode == "mongodb":
            res = self.mongo_db.deals.update_one({"id": deal_id}, {"$set": fields})
            return res.matched_count > 0

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            set_clauses = [f"{k} = ?" for k in fields.keys()]
            params = list(fields.values()) + [deal_id]
            sql = f"UPDATE deals SET {', '.join(set_clauses)} WHERE id = ?"
            cursor.execute(sql, params)
            conn.commit()
            updated = cursor.rowcount > 0
            conn.close()
            return updated

    # ------------------ Dispatches Operations ------------------
    def get_dispatches(self, limit: int = 50) -> List[Dict[str, Any]]:
        if self.mode == "mongodb":
            cursor = self.mongo_db.dispatches.find().sort("created_at", -1).limit(limit)
            dispatches = []
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                dispatches.append(doc)
            return dispatches

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM dispatches ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            dispatches = [dict(r) for r in rows]
            conn.close()
            return dispatches

    def get_dispatch_by_ref(self, ref_id: str) -> Optional[Dict[str, Any]]:
        """Finds a dispatch by dispatch id, deal_id, or item_id without any 100-row cap."""
        if self.mode == "mongodb":
            cursor = self.mongo_db.dispatches.find(
                {"$or": [{"id": ref_id}, {"deal_id": ref_id}, {"item_id": ref_id}]}
            ).sort("created_at", -1).limit(1)
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                return doc
            return None

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM dispatches
                WHERE id = ? OR deal_id = ? OR item_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (ref_id, ref_id, ref_id),
            )
            row = cursor.fetchone()
            conn.close()
            return dict(row) if row else None

    def find_tracking_records(self, query: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Finds matching deal and dispatch records by exact IDs (deal id, dispatch id, item id, buyer id)
        or normalized phone number (buyer phone / driver phone) across the full ledger.
        """
        q = (query or "").strip()
        if not q:
            return None, None
        norm_q = normalize_phone(q)

        all_deals = self.get_deals(limit=10000)
        all_dispatches = self.get_dispatches(limit=10000)

        matched_deal = None
        for d in all_deals:
            if d.get("id") == q or d.get("item_id") == q or d.get("buyer_id") == q:
                matched_deal = d
                break
            if norm_q and normalize_phone(d.get("buyer_id")) == norm_q:
                matched_deal = d
                break

        matched_dispatch = None
        for disp in all_dispatches:
            if disp.get("id") == q or disp.get("deal_id") == q or disp.get("item_id") == q:
                matched_dispatch = disp
                break
            if matched_deal and (
                disp.get("deal_id") == matched_deal.get("id")
                or disp.get("item_id") == matched_deal.get("item_id")
            ):
                matched_dispatch = disp
                break

        if not matched_deal and not matched_dispatch and norm_q:
            for disp in all_dispatches:
                if normalize_phone(disp.get("driver_phone")) == norm_q:
                    matched_dispatch = disp
                    break

        if matched_dispatch and not matched_deal:
            for d in all_deals:
                if d.get("id") == matched_dispatch.get("deal_id") or d.get("item_id") == matched_dispatch.get("item_id"):
                    matched_deal = d
                    break

        return matched_deal, matched_dispatch

    def insert_dispatch(self, dispatch: Dict[str, Any]) -> str:
        dispatch["created_at"] = dispatch.get("created_at") or datetime.utcnow().isoformat()
        dispatch["updated_at"] = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            self.mongo_db.dispatches.insert_one(dict(dispatch))
            return dispatch["id"]

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO dispatches (
                    id, deal_id, item_id, district, pickup_address, delivery_address, delivery_district,
                    driver_id, driver_name, driver_phone, driver_vehicle,
                    payout_cash, retry_count, status, current_step, driver_lat, driver_lng,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    dispatch["id"],
                    dispatch.get("deal_id", ""),
                    dispatch["item_id"],
                    dispatch.get("district", "El-Attarine"),
                    dispatch.get("pickup_address", ""),
                    dispatch.get("delivery_address", ""),
                    dispatch.get("delivery_district", ""),
                    dispatch.get("driver_id", ""),
                    dispatch.get("driver_name", "Pending Assignment"),
                    dispatch.get("driver_phone", ""),
                    dispatch.get("driver_vehicle", ""),
                    float(dispatch.get("payout_cash", 0.0)),
                    int(dispatch.get("retry_count", 0)),
                    dispatch.get("status", "PENDING"),
                    dispatch.get("current_step", "ORDER_PLACED"),
                    dispatch.get("driver_lat"),
                    dispatch.get("driver_lng"),
                    dispatch["created_at"],
                    dispatch["updated_at"],
                ),
            )
            conn.commit()
            conn.close()
            return dispatch["id"]

    def update_dispatch(self, dispatch_id: str, fields: Dict[str, Any]) -> bool:
        fields = dict(fields)
        fields["updated_at"] = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            res = self.mongo_db.dispatches.update_one({"id": dispatch_id}, {"$set": fields})
            return res.matched_count > 0

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            set_clauses = [f"{k} = ?" for k in fields.keys()]
            params = list(fields.values()) + [dispatch_id]
            sql = f"UPDATE dispatches SET {', '.join(set_clauses)} WHERE id = ?"
            cursor.execute(sql, params)
            conn.commit()
            updated = cursor.rowcount > 0
            conn.close()
            return updated

    # ------------------ Trader Rules ------------------
    def get_trader_rules(self) -> List[Dict[str, Any]]:
        if self.mode == "mongodb":
            cursor = self.mongo_db.trader_rules.find()
            rules = []
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                rules.append(doc)
            return rules

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trader_rules")
            rows = cursor.fetchall()
            rules = [dict(r) for r in rows]
            conn.close()
            return rules

    # ------------------ Metrics & KPIs ------------------
    def get_metrics(self) -> Dict[str, Any]:
        if self.mode == "mongodb":
            total_items = self.mongo_db.items.count_documents({})
            auto_approved = self.mongo_db.items.count_documents({"status": "AUTO_APPROVED"})
            pending_review = self.mongo_db.items.count_documents({"status": "PENDING_REVIEW"})
            agg = list(
                self.mongo_db.deals.aggregate(
                    [
                        {"$match": {"status": {"$in": ["COMMISSION_LOCKED", "SETTLED"]}}},
                        {"$group": {"_id": None, "total": {"$sum": "$commission_locked"}}},
                    ]
                )
            )
            locked_commission = float(agg[0]["total"]) if agg else 0.0
            auto_approval_rate = round((auto_approved / total_items * 100), 1) if total_items > 0 else 0.0
            return {
                "total_items": total_items,
                "auto_approved_count": auto_approved,
                "pending_review_count": pending_review,
                "auto_approval_percent": auto_approval_rate,
                "locked_commission_total": round(locked_commission, 2),
                "storage_mode": self.mode,
            }

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) FROM items")
            total_items = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM items WHERE status = 'AUTO_APPROVED'")
            auto_approved = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM items WHERE status = 'PENDING_REVIEW'")
            pending_review = cursor.fetchone()[0]

            cursor.execute("SELECT COALESCE(SUM(commission_locked), 0.0) FROM deals WHERE status IN ('COMMISSION_LOCKED', 'SETTLED')")
            locked_commission = cursor.fetchone()[0]

            auto_approval_rate = round((auto_approved / total_items * 100), 1) if total_items > 0 else 0.0
            conn.close()

            return {
                "total_items": total_items,
                "auto_approved_count": auto_approved,
                "pending_review_count": pending_review,
                "auto_approval_percent": auto_approval_rate,
                "locked_commission_total": round(locked_commission, 2),
                "storage_mode": self.mode,
            }

    # ------------------ Admin & Fleets Operations ------------------
    def get_users(self) -> List[Dict[str, Any]]:
        if self.mode == "mongodb":
            cursor = self.mongo_db.users.find().sort("created_at", -1)
            users = []
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                users.append(_sanitize_user(doc))
            return users

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users ORDER BY created_at DESC")
            rows = cursor.fetchall()
            users = [_sanitize_user(dict(r)) for r in rows]
            conn.close()
            return users

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not user_id:
            return None
        if self.mode == "mongodb":
            doc = self.mongo_db.users.find_one({"id": user_id})
            if doc:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
            return _sanitize_user(doc)

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            conn.close()
            return _sanitize_user(dict(row)) if row else None

    def get_user_for_auth(self, identity: str) -> Optional[Dict[str, Any]]:
        """Internal lookup returning user record WITH password_hash for authentication checks."""
        ident = (identity or "").strip()
        if not ident:
            return None
        ident_lower = ident.lower()
        if self.mode == "mongodb":
            doc = self.mongo_db.users.find_one(
                {
                    "$or": [
                        {"username": ident},
                        {"email": ident},
                        {"username": {"$regex": f"^{re.escape(ident)}$", "$options": "i"}},
                        {"email": {"$regex": f"^{re.escape(ident)}$", "$options": "i"}},
                    ]
                }
            )
            if doc:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
            return doc

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1",
                (ident_lower, ident_lower),
            )
            row = cursor.fetchone()
            conn.close()
            return dict(row) if row else None

    def upsert_google_demo_user(self) -> Dict[str, Any]:
        """Returns (and seeds if absent) the real Google demo buyer account."""
        demo_id = "USR-GOOGLE-1"
        existing = self.get_user_by_id(demo_id)
        if existing:
            return existing

        demo_user = {
            "id": demo_id,
            "name": "مستخدم جوجل الإسكندراني",
            "username": "alex_google_user",
            "email": "user@gmail.com",
            "role": "buyer",
            "district": "Sidi Beshr",
            "phone": "01000000001",
            "password_hash": "",
            "status": "ACTIVE",
            "orders_count": 0,
            "total_volume": 0.0,
            "created_at": datetime.utcnow().isoformat(),
        }
        self.create_user(demo_user)
        return self.get_user_by_id(demo_id) or _sanitize_user(demo_user)

    def create_user(self, user: Dict[str, Any]) -> bool:
        """Insert a new user. Returns False if username or email already exists."""
        user = dict(user)
        user["created_at"] = user.get("created_at") or datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            existing = self.mongo_db.users.find_one(
                {
                    "$or": [
                        {"username": user.get("username", "")},
                        {"email": user.get("email", "")},
                    ]
                }
            )
            if existing:
                return False
            try:
                self.mongo_db.users.insert_one(user)
                return True
            except Exception as e:
                if "duplicate" in str(e).lower() or "11000" in str(e):
                    return False
                raise

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    """
                    INSERT INTO users (id, name, username, email, role, district, phone, password_hash, status, orders_count, total_volume, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user["id"],
                        user.get("name", ""),
                        user.get("username", ""),
                        user.get("email", ""),
                        user.get("role", "buyer"),
                        user.get("district", "Sidi Beshr"),
                        user.get("phone", ""),
                        user.get("password_hash", ""),
                        user.get("status", "ACTIVE"),
                        user.get("orders_count", 0),
                        user.get("total_volume", 0.0),
                        user["created_at"],
                    ),
                )
                conn.commit()
                conn.close()
                return True
            except sqlite3.IntegrityError:
                conn.close()
                return False
            except Exception:
                conn.close()
                return False

    def update_user_status(self, user_id: str, status: str) -> bool:
        if self.mode == "mongodb":
            res = self.mongo_db.users.update_one({"id": user_id}, {"$set": {"status": status}})
            return res.matched_count > 0

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET status = ? WHERE id = ?", (status, user_id))
            conn.commit()
            updated = cursor.rowcount > 0
            conn.close()
            return updated

    def get_drivers(self) -> List[Dict[str, Any]]:
        if self.mode == "mongodb":
            cursor = self.mongo_db.drivers.find().sort([("status", 1), ("district", 1)])
            drivers = []
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                drivers.append(doc)
            return drivers

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM drivers ORDER BY status ASC, district ASC")
            rows = cursor.fetchall()
            drivers = [dict(r) for r in rows]
            conn.close()
            return drivers

    def update_driver_status(self, driver_id: str, status: str, deal_id: Optional[str] = None) -> bool:
        now = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            res = self.mongo_db.drivers.update_one(
                {"id": driver_id},
                {"$set": {"status": status, "current_deal_id": deal_id, "updated_at": now}},
            )
            return res.matched_count > 0

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE drivers SET status = ?, current_deal_id = ?, updated_at = ? WHERE id = ?",
                (status, deal_id, now, driver_id),
            )
            conn.commit()
            updated = cursor.rowcount > 0
            conn.close()
            return updated

    def get_financials_summary(self) -> Dict[str, Any]:
        if self.mode == "mongodb":
            deals_agg = list(
                self.mongo_db.deals.aggregate(
                    [
                        {
                            "$group": {
                                "_id": None,
                                "gmv": {"$sum": "$agreed_price"},
                                "comm": {"$sum": "$commission_locked"},
                                "count": {"$sum": 1},
                            }
                        }
                    ]
                )
            )
            gmv = float(deals_agg[0]["gmv"]) if deals_agg else 0.0
            platform_revenue = float(deals_agg[0]["comm"]) if deals_agg else 0.0
            total_deals = int(deals_agg[0]["count"]) if deals_agg else 0

            disp_agg = list(
                self.mongo_db.dispatches.aggregate(
                    [{"$group": {"_id": None, "payouts": {"$sum": "$payout_cash"}}}]
                )
            )
            driver_payouts = float(disp_agg[0]["payouts"]) if disp_agg else 0.0
            active_users = self.mongo_db.users.count_documents({"status": "ACTIVE"})
            blocked_users = self.mongo_db.users.count_documents({"status": "BLOCKED"})
        else:
            with _sqlite_lock:
                conn = self._get_sqlite_conn()
                cursor = conn.cursor()

                cursor.execute("SELECT COALESCE(SUM(agreed_price), 0.0) FROM deals")
                gmv = cursor.fetchone()[0]

                cursor.execute("SELECT COALESCE(SUM(commission_locked), 0.0) FROM deals")
                platform_revenue = cursor.fetchone()[0]

                cursor.execute("SELECT COALESCE(SUM(payout_cash), 0.0) FROM dispatches")
                driver_payouts = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM deals")
                total_deals = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'")
                active_users = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'BLOCKED'")
                blocked_users = cursor.fetchone()[0]
                conn.close()

        time_series = [
            {"day": "السبت", "gmv": round(gmv * 0.12), "comm": round(platform_revenue * 0.12)},
            {"day": "الأحد", "gmv": round(gmv * 0.18), "comm": round(platform_revenue * 0.18)},
            {"day": "الإثنين", "gmv": round(gmv * 0.14), "comm": round(platform_revenue * 0.14)},
            {"day": "الثلاثاء", "gmv": round(gmv * 0.22), "comm": round(platform_revenue * 0.22)},
            {"day": "الأربعاء", "gmv": round(gmv * 0.16), "comm": round(platform_revenue * 0.16)},
            {"day": "الخميس", "gmv": round(gmv * 0.28), "comm": round(platform_revenue * 0.28)},
            {"day": "الجمعة", "gmv": round(gmv * 0.35), "comm": round(platform_revenue * 0.35)},
        ]

        return {
            "total_gmv": round(gmv, 2),
            "platform_net_commission": round(platform_revenue, 2),
            "driver_cash_payouts": round(driver_payouts, 2),
            "total_deals_count": total_deals,
            "active_users_count": active_users,
            "blocked_users_count": blocked_users,
            "time_series": time_series,
        }

    # ------------------ Applications Operations (Seller & Driver Onboarding) ------------------
    def create_application(self, app_data: Dict[str, Any]) -> str:
        app_data = dict(app_data)
        app_data["created_at"] = app_data.get("created_at") or datetime.utcnow().isoformat()
        app_id = app_data.get("id") or f"APP-{int(datetime.utcnow().timestamp() * 1000)}-{uuid.uuid4().hex[:4].upper()}"
        app_data["id"] = app_id

        if self.mode == "mongodb":
            self.mongo_db.applications.insert_one(dict(app_data))
            return app_id

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            app_json = json.dumps(app_data.get("application_data", {})) if isinstance(app_data.get("application_data"), (dict, list)) else str(app_data.get("application_data", "{}"))
            cursor.execute(
                """
                INSERT OR REPLACE INTO applications (
                    id, user_id, name, phone, role, district, application_data, status, admin_notes, created_at, reviewed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    app_id,
                    app_data.get("user_id", ""),
                    app_data.get("name", ""),
                    app_data.get("phone", ""),
                    app_data.get("role", "seller"),
                    app_data.get("district", "Sidi Beshr"),
                    app_json,
                    app_data.get("status", "PENDING_APPROVAL"),
                    app_data.get("admin_notes", ""),
                    app_data["created_at"],
                    app_data.get("reviewed_at", ""),
                ),
            )
            conn.commit()
            conn.close()
            return app_id

    def get_applications(self, status: Optional[str] = None, role: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        if self.mode == "mongodb":
            q: Dict[str, Any] = {}
            if status and status != "All":
                q["status"] = status
            if role and role != "All":
                q["role"] = role
            cursor = self.mongo_db.applications.find(q).sort("created_at", -1).limit(limit)
            apps = []
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                apps.append(doc)
            return apps

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            conditions = []
            params: List[Any] = []
            if status and status != "All":
                conditions.append("status = ?")
                params.append(status)
            if role and role != "All":
                conditions.append("role = ?")
                params.append(role)
            where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
            sql = f"SELECT * FROM applications{where_clause} ORDER BY created_at DESC LIMIT ?"
            params.append(limit)
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            apps = []
            for r in rows:
                item = dict(r)
                try:
                    item["application_data"] = json.loads(item["application_data"])
                except Exception:
                    pass
                apps.append(item)
            conn.close()
            return apps

    def get_application_by_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.mode == "mongodb":
            cursor = self.mongo_db.applications.find({"user_id": user_id}).sort("created_at", -1).limit(1)
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                return doc
            return None

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (user_id,))
            row = cursor.fetchone()
            conn.close()
            if not row:
                return None
            item = dict(row)
            try:
                item["application_data"] = json.loads(item["application_data"])
            except Exception:
                pass
            return item

    def get_application_by_id(self, app_id: str) -> Optional[Dict[str, Any]]:
        if self.mode == "mongodb":
            doc = self.mongo_db.applications.find_one({"id": app_id})
            if doc:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
            return doc

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM applications WHERE id = ?", (app_id,))
            row = cursor.fetchone()
            conn.close()
            if not row:
                return None
            item = dict(row)
            try:
                item["application_data"] = json.loads(item["application_data"])
            except Exception:
                pass
            return item

    def review_application(self, app_id: str, status: str, admin_notes: Optional[str] = None) -> bool:
        reviewed_at = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            app_doc = self.mongo_db.applications.find_one({"id": app_id})
            if not app_doc:
                return False
            self.mongo_db.applications.update_one(
                {"id": app_id},
                {"$set": {"status": status, "admin_notes": admin_notes or "", "reviewed_at": reviewed_at}},
            )
            if status == "APPROVED":
                u_id = app_doc.get("user_id") or f"USR-{uuid.uuid4().hex[:6].upper()}"
                u_role = (app_doc.get("role") or "seller").lower()
                u_name = app_doc.get("name") or "مستخدم معتمد"
                u_phone = app_doc.get("phone") or ""
                u_dist = app_doc.get("district") or "Sidi Beshr"
                existing_user = self.mongo_db.users.find_one({"id": u_id})
                if existing_user:
                    self.mongo_db.users.update_one(
                        {"id": u_id},
                        {"$set": {"role": u_role, "status": "ACTIVE"}},
                    )
                else:
                    slug = re.sub(r"[^a-zA-Z0-9_]", "_", u_id).lower()
                    self.mongo_db.users.insert_one(
                        {
                            "id": u_id,
                            "name": u_name,
                            "username": f"{slug}_{uuid.uuid4().hex[:4]}",
                            "email": f"{slug}_{uuid.uuid4().hex[:4]}@antifesal.local",
                            "role": u_role,
                            "district": u_dist,
                            "phone": u_phone,
                            "password_hash": "",
                            "status": "ACTIVE",
                            "orders_count": 0,
                            "total_volume": 0.0,
                            "created_at": reviewed_at,
                        }
                    )

                if u_role == "driver":
                    app_details = app_doc.get("application_data") or {}
                    vehicle_type = app_details.get("vehicle_type") or "فان بيك أب مجهز"
                    self.mongo_db.drivers.update_one(
                        {"id": u_id},
                        {
                            "$set": {
                                "name": u_name,
                                "phone": u_phone,
                                "district": u_dist,
                                "vehicle_type": vehicle_type,
                                "updated_at": reviewed_at,
                            },
                            "$setOnInsert": {
                                "id": u_id,
                                "status": "FREE",
                                "current_deal_id": None,
                                "rating": 5.0,
                                "completed_trips": 0,
                            },
                        },
                        upsert=True,
                    )
            return True

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT user_id, name, phone, role, district, application_data FROM applications WHERE id = ?",
                (app_id,),
            )
            row = cursor.fetchone()
            if not row:
                conn.close()
                return False

            cursor.execute(
                """
                UPDATE applications SET status = ?, admin_notes = ?, reviewed_at = ? WHERE id = ?
                """,
                (status, admin_notes or "", reviewed_at, app_id),
            )
            app_updated = cursor.rowcount > 0

            if status == "APPROVED":
                u_id = row[0] or f"USR-{uuid.uuid4().hex[:6].upper()}"
                u_name = row[1] or "مستخدم معتمد"
                u_phone = row[2] or ""
                u_role = (row[3] or "seller").lower()
                u_dist = row[4] or "Sidi Beshr"
                try:
                    app_details = json.loads(row[5]) if isinstance(row[5], str) else (row[5] or {})
                except Exception:
                    app_details = {}

                cursor.execute("SELECT id FROM users WHERE id = ?", (u_id,))
                if cursor.fetchone():
                    cursor.execute("UPDATE users SET role = ?, status = 'ACTIVE' WHERE id = ?", (u_role, u_id))
                else:
                    slug = re.sub(r"[^a-zA-Z0-9_]", "_", u_id).lower()
                    uniq = uuid.uuid4().hex[:4]
                    cursor.execute(
                        """
                        INSERT INTO users (id, name, username, email, role, district, phone, password_hash, status, orders_count, total_volume, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0, 0.0, ?)
                        """,
                        (u_id, u_name, f"{slug}_{uniq}", f"{slug}_{uniq}@antifesal.local", u_role, u_dist, u_phone, "", reviewed_at),
                    )

                if u_role == "driver":
                    vehicle_type = app_details.get("vehicle_type") or "فان بيك أب مجهز"
                    cursor.execute("SELECT id FROM drivers WHERE id = ?", (u_id,))
                    if cursor.fetchone():
                        cursor.execute(
                            "UPDATE drivers SET name = ?, phone = ?, district = ?, vehicle_type = ?, updated_at = ? WHERE id = ?",
                            (u_name, u_phone, u_dist, vehicle_type, reviewed_at, u_id),
                        )
                    else:
                        cursor.execute(
                            """
                            INSERT INTO drivers (id, name, phone, district, status, current_deal_id, vehicle_type, rating, completed_trips, updated_at)
                            VALUES (?, ?, ?, ?, 'FREE', NULL, ?, 5.0, 0, ?)
                            """,
                            (u_id, u_name, u_phone, u_dist, vehicle_type, reviewed_at),
                        )

            conn.commit()
            conn.close()
            return app_updated

    # ------------------ Driver Live Locations ------------------
    def update_driver_location(
        self,
        driver_id: str,
        driver_name: str,
        lat: float,
        lng: float,
        heading: float = 0.0,
        sharing_enabled: bool = True,
    ) -> bool:
        now = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            self.mongo_db.driver_locations.update_one(
                {"driver_id": driver_id},
                {
                    "$set": {
                        "driver_name": driver_name,
                        "lat": float(lat),
                        "lng": float(lng),
                        "heading": float(heading),
                        "sharing_enabled": bool(sharing_enabled),
                        "last_updated": now,
                    }
                },
                upsert=True,
            )
            return True

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO driver_locations (
                    driver_id, driver_name, lat, lng, heading, sharing_enabled, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (driver_id, driver_name, float(lat), float(lng), float(heading), 1 if sharing_enabled else 0, now),
            )
            conn.commit()
            conn.close()
            return True

    def get_driver_location(self, driver_id: str) -> Optional[Dict[str, Any]]:
        if not driver_id:
            return None
        if self.mode == "mongodb":
            doc = self.mongo_db.driver_locations.find_one({"driver_id": driver_id})
            if doc:
                doc.pop("_id", None)
            return doc

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM driver_locations WHERE driver_id = ?", (driver_id,))
            row = cursor.fetchone()
            conn.close()
            return dict(row) if row else None

    def get_driver_location_by_name(self, driver_name: str) -> Optional[Dict[str, Any]]:
        if not driver_name:
            return None
        if self.mode == "mongodb":
            cursor = self.mongo_db.driver_locations.find(
                {"driver_name": driver_name, "sharing_enabled": True}
            ).sort("last_updated", -1).limit(1)
            for doc in cursor:
                doc.pop("_id", None)
                return doc
            return None

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM driver_locations
                WHERE driver_name = ? AND sharing_enabled = 1
                ORDER BY last_updated DESC
                LIMIT 1
                """,
                (driver_name,),
            )
            row = cursor.fetchone()
            conn.close()
            return dict(row) if row else None

    def update_dispatch_step(
        self,
        dispatch_id: str,
        step: str,
        driver_lat: Optional[float] = None,
        driver_lng: Optional[float] = None,
    ) -> bool:
        now = datetime.utcnow().isoformat()
        step_upper = (step or "").strip().upper()
        fields: Dict[str, Any] = {"current_step": step_upper, "updated_at": now}
        if driver_lat is not None and driver_lng is not None:
            fields["driver_lat"] = float(driver_lat)
            fields["driver_lng"] = float(driver_lng)
        if step_upper == "DELIVERED_SETTLED":
            fields["status"] = "COMPLETED"

        updated = self.update_dispatch(dispatch_id, fields)
        if updated and step_upper == "DELIVERED_SETTLED":
            disp = self.get_dispatch_by_ref(dispatch_id)
            if disp:
                if disp.get("deal_id"):
                    self.update_deal(disp["deal_id"], {"status": "SETTLED"})
                if disp.get("item_id"):
                    self.update_item(disp["item_id"], {"status": "SOLD"})
        return updated

    # ------------------ Advanced Admin Analytics ------------------
    def get_admin_analytics(self) -> Dict[str, Any]:
        if self.mode == "mongodb":
            deals = list(self.mongo_db.deals.find())
            total_deals_sold = len(deals)
            total_gmv = sum(float(d.get("agreed_price", 0.0) or 0.0) for d in deals)
            total_net_commission = sum(float(d.get("commission_locked", 0.0) or 0.0) for d in deals)

            disp_agg = list(
                self.mongo_db.dispatches.aggregate(
                    [{"$group": {"_id": None, "payouts": {"$sum": "$payout_cash"}}}]
                )
            )
            driver_payouts = float(disp_agg[0]["payouts"]) if disp_agg else 0.0

            item_ids = [d.get("item_id") for d in deals if d.get("item_id")]
            items_by_id: Dict[str, Dict[str, Any]] = {}
            if item_ids:
                for it in self.mongo_db.items.find({"id": {"$in": item_ids}}):
                    items_by_id[it["id"]] = it

            cat_agg: Dict[str, Dict[str, Any]] = {}
            dist_agg: Dict[str, Dict[str, Any]] = {}
            for d in deals:
                it = items_by_id.get(d.get("item_id"), {})
                price = float(d.get("agreed_price", 0.0) or 0.0)
                cat = it.get("category")
                if cat:
                    entry = cat_agg.setdefault(cat, {"category": cat, "count": 0, "volume": 0.0})
                    entry["count"] += 1
                    entry["volume"] += price
                dist = it.get("district")
                if dist:
                    entry = dist_agg.setdefault(dist, {"district": dist, "orders_count": 0, "volume": 0.0})
                    entry["orders_count"] += 1
                    entry["volume"] += price

            top_categories = sorted(cat_agg.values(), key=lambda x: x["count"], reverse=True)
            for c in top_categories:
                c["volume"] = round(c["volume"], 2)
                c["percentage"] = round((c["count"] / total_deals_sold * 100), 1) if total_deals_sold > 0 else 0.0

            top_districts = sorted(dist_agg.values(), key=lambda x: x["orders_count"], reverse=True)[:5]
            for d_entry in top_districts:
                d_entry["volume"] = round(d_entry["volume"], 2)

            pending_apps_count = self.mongo_db.applications.count_documents({"status": "PENDING_APPROVAL"})
            active_users_count = self.mongo_db.users.count_documents({"status": "ACTIVE"})

            return {
                "total_orders_sold": total_deals_sold,
                "total_gmv": round(total_gmv, 2),
                "platform_net_commission": round(total_net_commission, 2),
                "driver_cash_payouts": round(driver_payouts, 2),
                "top_categories": top_categories,
                "top_districts": top_districts,
                "pending_applications_count": pending_apps_count,
                "active_users_count": active_users_count,
            }

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*), COALESCE(SUM(agreed_price), 0.0), COALESCE(SUM(commission_locked), 0.0) FROM deals")
            row = cursor.fetchone()
            total_deals_sold = row[0]
            total_gmv = row[1]
            total_net_commission = row[2]

            cursor.execute("SELECT COALESCE(SUM(payout_cash), 0.0) FROM dispatches")
            driver_payouts = cursor.fetchone()[0]

            cursor.execute(
                """
                SELECT i.category, COUNT(d.id) as deals_count, COALESCE(SUM(d.agreed_price), 0.0) as total_volume
                FROM deals d
                JOIN items i ON d.item_id = i.id
                GROUP BY i.category
                ORDER BY deals_count DESC
                """
            )
            category_rows = cursor.fetchall()
            top_categories = []
            for r in category_rows:
                pct = round((r[1] / total_deals_sold * 100), 1) if total_deals_sold > 0 else 0.0
                top_categories.append(
                    {
                        "category": r[0],
                        "count": r[1],
                        "volume": round(r[2], 2),
                        "percentage": pct,
                    }
                )

            cursor.execute(
                """
                SELECT i.district, COUNT(d.id) as orders_count, COALESCE(SUM(d.agreed_price), 0.0) as total_volume
                FROM deals d
                JOIN items i ON d.item_id = i.id
                GROUP BY i.district
                ORDER BY orders_count DESC
                LIMIT 5
                """
            )
            district_rows = cursor.fetchall()
            top_districts = []
            for r in district_rows:
                top_districts.append(
                    {
                        "district": r[0],
                        "orders_count": r[1],
                        "volume": round(r[2], 2),
                    }
                )

            cursor.execute("SELECT COUNT(*) FROM applications WHERE status = 'PENDING_APPROVAL'")
            pending_apps_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'")
            active_users_count = cursor.fetchone()[0]

            conn.close()

            return {
                "total_orders_sold": total_deals_sold,
                "total_gmv": round(total_gmv, 2),
                "platform_net_commission": round(total_net_commission, 2),
                "driver_cash_payouts": round(driver_payouts, 2),
                "top_categories": top_categories,
                "top_districts": top_districts,
                "pending_applications_count": pending_apps_count,
                "active_users_count": active_users_count,
            }


# Singleton instance
db = DatabaseAdapter()
