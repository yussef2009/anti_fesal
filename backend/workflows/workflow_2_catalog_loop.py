"""
Anti-Fesal (آنتي فصال) - Workflow 2: Daily Catalog Loop & Corrupt Record Filter
Iterates through inventory to build Alexandria's daily markdown catalog (data/daily_catalog.md).
Identifies and cleanly skips corrupted records (empty category, missing images, quoted_price <= 0)
logging each incident to logs/skipped_items_log.csv without throwing unhandled exceptions.
"""

import csv
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import DAILY_CATALOG_MD, RELIABILITY_TEST_100_CSV
from backend.db_adapter import db
from logs.logger import log_skipped_item

logger = logging.getLogger("anti_fesal.workflow_2_catalog")

class CatalogLoopWorkflow:
    def run_catalog_generation(self, items_source: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Processes items to compile the daily catalog.
        If items_source is None, pulls all approved items from the database.
        """
        if items_source is None:
            # Query approved items from DB
            raw_items = db.get_items(status="AUTO_APPROVED", limit=200)
        else:
            raw_items = items_source

        total_examined = len(raw_items)
        valid_items = []
        skipped_items = []

        for item in raw_items:
            item_id = str(item.get("item_id") or item.get("id") or "UNKNOWN")
            title = str(item.get("title") or "Untitled Listing")
            category = str(item.get("category") or "").strip()

            # Retrieve price
            raw_price = item.get("quoted_price")
            if raw_price is None:
                raw_price = item.get("expected_resale_price", 0.0)
            try:
                price = float(raw_price)
            except (ValueError, TypeError):
                price = 0.0

            # Retrieve images
            raw_imgs = item.get("image_urls")
            has_image = True
            if not raw_imgs:
                has_image = False
            elif isinstance(raw_imgs, str):
                cleaned = raw_imgs.strip()
                if cleaned in ("", "[]", "null", "None"):
                    has_image = False
            elif isinstance(raw_imgs, list):
                if len(raw_imgs) == 0 or (len(raw_imgs) == 1 and not raw_imgs[0]):
                    has_image = False

            # Corruption Check 1: Empty category
            if not category:
                reason = "Empty category specification"
                log_skipped_item(item_id, title, category, price, reason)
                skipped_items.append({"id": item_id, "title": title, "reason": reason})
                continue

            # Corruption Check 2: Missing image
            if not has_image:
                reason = "Missing product photo/image"
                log_skipped_item(item_id, title, category, price, reason)
                skipped_items.append({"id": item_id, "title": title, "reason": reason})
                continue

            # Corruption Check 3: Quoted price <= 0
            if price <= 0.0:
                reason = f"Invalid quoted price ({price} <= 0 EGP)"
                log_skipped_item(item_id, title, category, price, reason)
                skipped_items.append({"id": item_id, "title": title, "reason": reason})
                continue

            # Clean valid record
            valid_items.append({
                "id": item_id,
                "title": title,
                "category": category,
                "brand_model": item.get("brand_model", ""),
                "district": item.get("district", "Alexandria"),
                "condition_grade": item.get("condition_grade", "A"),
                "price": price
            })

        # Generate data/daily_catalog.md
        self._write_markdown_catalog(valid_items, total_examined, len(skipped_items))

        reliability_rate = round((len(valid_items) / total_examined * 100), 2) if total_examined > 0 else 100.0

        return {
            "total_examined": total_examined,
            "valid_items_count": len(valid_items),
            "skipped_items_count": len(skipped_items),
            "reliability_percent": reliability_rate,
            "catalog_path": str(DAILY_CATALOG_MD),
            "skipped_details": skipped_items
        }

    def _write_markdown_catalog(self, valid_items: List[Dict[str, Any]], total: int, skipped: int):
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        lines = [
            "# Anti-Fesal (آنتي فصال) — Alexandria Daily Verified Catalog",
            f"> Official Slogan: **\"سعّر، بيع، ومن غير وجع فصال\"**",
            f"> Generated: `{timestamp}` | Total Examined: `{total}` | Valid: `{len(valid_items)}` | Corrupt Skipped: `{skipped}`\n",
            "---",
            "## 🏷️ Verified Secondhand Listings (Fixed Price • No Fesal)\n"
        ]

        # Group by category
        by_category = {}
        for it in valid_items:
            cat = it["category"]
            by_category.setdefault(cat, []).append(it)

        for cat, items in by_category.items():
            lines.append(f"### 📦 {cat} ({len(items)} Items)")
            lines.append("| ID | Title & Specs | District | AI Grade | Fixed Price (EGP) | Status |")
            lines.append("| :--- | :--- | :--- | :---: | :---: | :--- |")
            for it in items:
                lines.append(f"| `{it['id']}` | **{it['title']}** ({it['brand_model']}) | {it['district']} | `{it['condition_grade']}` | **{it['price']:,.0f} EGP** | ✓ Verified Fixed |")
            lines.append("")

        DAILY_CATALOG_MD.parent.mkdir(parents=True, exist_ok=True)
        with open(DAILY_CATALOG_MD, mode="w", encoding="utf-8") as f:
            f.write("\n".join(lines))

workflow_catalog = CatalogLoopWorkflow()
