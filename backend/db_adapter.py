"""
Anti-Fesal (آنتي فصال) - Dual-Mode Database Adapter
Seamlessly switches between MongoDB Atlas and SQLite fallback (data/antifesal.db)
with identical unified CRUD contracts and zero downtime.
"""

import sqlite3
import json
import logging
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import MONGODB_URI, SQLITE_DB_PATH, HAS_MONGODB
from data.init_db import init_db

logger = logging.getLogger("anti_fesal.db_adapter")
_sqlite_lock = threading.Lock()

class DatabaseAdapter:
    def __init__(self):
        self.mode = "sqlite"
        self.mongo_client = None
        self.mongo_db = None

        if HAS_MONGODB:
            try:
                import pymongo
                self.mongo_client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
                # Test ping
                self.mongo_client.admin.command('ping')
                self.mongo_db = self.mongo_client.get_database("antifesal")
                self.mode = "mongodb"
                logger.info("Connected successfully to MongoDB Atlas cloud cluster.")
            except Exception as e:
                logger.warning(f"MongoDB Atlas connection failed: {e}. Falling back to SQLite.")
                self.mode = "sqlite"

        if self.mode == "sqlite":
            if not SQLITE_DB_PATH.exists():
                init_db()

    def _get_sqlite_conn(self):
        conn = sqlite3.connect(str(SQLITE_DB_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    # ------------------ Items Operations ------------------
    def get_items(self, category: Optional[str] = None, district: Optional[str] = None,
                  status: Optional[str] = None, search: Optional[str] = None,
                  limit: int = 100) -> List[Dict[str, Any]]:
        if self.mode == "mongodb":
            query = {}
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
                    {"brand_model": {"$regex": search, "$options": "i"}}
                ]
            cursor = self.mongo_db.items.find(query).sort("created_at", -1).limit(limit)
            items = []
            for doc in cursor:
                doc["id"] = doc.get("id") or str(doc.get("_id"))
                doc.pop("_id", None)
                items.append(doc)
            return items

        # SQLite fallback
        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            conditions = []
            params = []
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
            sql = f"SELECT * FROM items{where_clause} ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

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

            cursor.execute("""
            INSERT OR REPLACE INTO items (
                id, title, category, brand_model, description, district, seller_phone, seller_tier,
                image_urls, condition_grade, detected_defects, confidence_score,
                expected_resale_price, recommended_purchase_price, commission_rate, commission_amount,
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
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
                item["updated_at"]
            ))
            conn.commit()
            conn.close()
            return item["id"]

    def update_item(self, item_id: str, fields: Dict[str, Any]) -> bool:
        fields["updated_at"] = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            res = self.mongo_db.items.update_one({"id": item_id}, {"$set": fields})
            return res.modified_count > 0

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
            cursor.execute("""
            INSERT OR REPLACE INTO deals (id, item_id, seller_id, buyer_id, agreed_price, commission_locked, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                deal["id"],
                deal["item_id"],
                deal.get("seller_id", ""),
                deal.get("buyer_id", ""),
                float(deal["agreed_price"]),
                float(deal["commission_locked"]),
                deal.get("status", "OPEN"),
                deal["created_at"]
            ))
            conn.commit()
            conn.close()
            return deal["id"]

    def update_deal(self, deal_id: str, fields: Dict[str, Any]) -> bool:
        if self.mode == "mongodb":
            res = self.mongo_db.deals.update_one({"id": deal_id}, {"$set": fields})
            return res.modified_count > 0

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

    def insert_dispatch(self, dispatch: Dict[str, Any]) -> str:
        dispatch["created_at"] = dispatch.get("created_at") or datetime.utcnow().isoformat()
        dispatch["updated_at"] = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            self.mongo_db.dispatches.insert_one(dict(dispatch))
            return dispatch["id"]

        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO dispatches (
                id, deal_id, item_id, district, pickup_address, driver_name, driver_phone,
                payout_cash, retry_count, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dispatch["id"],
                dispatch.get("deal_id", ""),
                dispatch["item_id"],
                dispatch.get("district", "El-Attarine"),
                dispatch.get("pickup_address", ""),
                dispatch.get("driver_name", "Pending Assignment"),
                dispatch.get("driver_phone", ""),
                float(dispatch.get("payout_cash", 0.0)),
                int(dispatch.get("retry_count", 0)),
                dispatch.get("status", "PENDING"),
                dispatch["created_at"],
                dispatch["updated_at"]
            ))
            conn.commit()
            conn.close()
            return dispatch["id"]

    def update_dispatch(self, dispatch_id: str, fields: Dict[str, Any]) -> bool:
        fields["updated_at"] = datetime.utcnow().isoformat()
        if self.mode == "mongodb":
            res = self.mongo_db.dispatches.update_one({"id": dispatch_id}, {"$set": fields})
            return res.modified_count > 0

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
                "storage_mode": self.mode
            }

    # ------------------ Admin & Fleets Operations ------------------
    def get_users(self) -> List[Dict[str, Any]]:
        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users ORDER BY created_at DESC")
            rows = cursor.fetchall()
            users = [dict(r) for r in rows]
            conn.close()
            return users

    def update_user_status(self, user_id: str, status: str) -> bool:
        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("UPDATE users SET status = ? WHERE id = ?", (status, user_id))
            conn.commit()
            updated = cursor.rowcount > 0
            conn.close()
            return updated

    def get_drivers(self) -> List[Dict[str, Any]]:
        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM drivers ORDER BY status ASC, district ASC")
            rows = cursor.fetchall()
            drivers = [dict(r) for r in rows]
            conn.close()
            return drivers

    def update_driver_status(self, driver_id: str, status: str, deal_id: Optional[str] = None) -> bool:
        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()
            cursor.execute("UPDATE drivers SET status = ?, current_deal_id = ?, updated_at = ? WHERE id = ?",
                           (status, deal_id, datetime.utcnow().isoformat(), driver_id))
            conn.commit()
            updated = cursor.rowcount > 0
            conn.close()
            return updated

    def get_financials_summary(self) -> Dict[str, Any]:
        with _sqlite_lock:
            conn = self._get_sqlite_conn()
            cursor = conn.cursor()

            # Sum GMV (agreed_price)
            cursor.execute("SELECT COALESCE(SUM(agreed_price), 0.0) FROM deals")
            gmv = cursor.fetchone()[0]

            # Sum Platform Commission
            cursor.execute("SELECT COALESCE(SUM(commission_locked), 0.0) FROM deals")
            platform_revenue = cursor.fetchone()[0]

            # Sum Driver Payouts
            cursor.execute("SELECT COALESCE(SUM(payout_cash), 0.0) FROM dispatches")
            driver_payouts = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM deals")
            total_deals = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'")
            active_users = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'BLOCKED'")
            blocked_users = cursor.fetchone()[0]

            # Daily trends for graph (mocked realistic timeline based on deals)
            time_series = [
                {"day": "السبت", "gmv": round(gmv * 0.12), "comm": round(platform_revenue * 0.12)},
                {"day": "الأحد", "gmv": round(gmv * 0.18), "comm": round(platform_revenue * 0.18)},
                {"day": "الإثنين", "gmv": round(gmv * 0.14), "comm": round(platform_revenue * 0.14)},
                {"day": "الثلاثاء", "gmv": round(gmv * 0.22), "comm": round(platform_revenue * 0.22)},
                {"day": "الأربعاء", "gmv": round(gmv * 0.16), "comm": round(platform_revenue * 0.16)},
                {"day": "الخميس", "gmv": round(gmv * 0.28), "comm": round(platform_revenue * 0.28)},
                {"day": "الجمعة", "gmv": round(gmv * 0.35), "comm": round(platform_revenue * 0.35)}
            ]

            conn.close()

            return {
                "total_gmv": round(gmv, 2),
                "platform_net_commission": round(platform_revenue, 2),
                "driver_cash_payouts": round(driver_payouts, 2),
                "total_deals_count": total_deals,
                "active_users_count": active_users,
                "blocked_users_count": blocked_users,
                "time_series": time_series
            }

# Singleton instance
db = DatabaseAdapter()
