"""
Anti-Fesal (آنتي فصال) - Agent 2: Valuation & Pricing Engine
Dynamically prices secondhand inventory against Alexandria's localized price matrix,
applies condition multipliers, computes purchase buyout quote (Resale * 0.72),
and locks brokerage commission tiers (8% Everyday Seller, 5% Pro Trader, 3% Enterprise).
"""

import csv
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import sys

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import (
    PRICE_MATRIX_CSV, GRADE_MULTIPLIERS, PURCHASE_PRICE_FACTOR,
    COMMISSION, COMMISSION_PRO, COMMISSION_ENTERPRISE,
    SLOW_STOCK_DAYS, SLOW_STOCK_DISCOUNT
)

logger = logging.getLogger("anti_fesal.valuation_engine")

class ValuationEngineAgent:
    def __init__(self):
        self.price_matrix = self._load_price_matrix()

    def _load_price_matrix(self) -> Dict[str, Dict[str, Any]]:
        matrix = {}
        if not PRICE_MATRIX_CSV.exists():
            logger.warning(f"Price matrix CSV missing at {PRICE_MATRIX_CSV}")
            return matrix

        with open(PRICE_MATRIX_CSV, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                brand_model = row["brand_model"].strip()
                matrix[brand_model.lower()] = {
                    "category": row["category"].strip(),
                    "brand_model": brand_model,
                    "market_base_price_egp": float(row["market_base_price_egp"]),
                    "depreciation_rate_annual": float(row.get("depreciation_rate_annual", 0.08)),
                    "min_grade_allowed": row.get("min_grade_allowed", "D").strip().upper()
                }
        return matrix

    def value_item(self, category: str, brand_model: str, condition_grade: str,
                   seller_tier: str = "Everyday Seller",
                   age_days: int = 0) -> Dict[str, Any]:
        """
        Calculates resale valuation, recommended instant purchase quote,
        and tier-based brokerage commission.
        """
        grade = (condition_grade or "B").upper()
        multiplier = GRADE_MULTIPLIERS.get(grade, 0.80)

        # Lookup base price in matrix
        base_price = self._find_base_price(category, brand_model)

        # Raw resale valuation
        resale_price = base_price * multiplier

        # Apply 14-day slow stock markdown if applicable (-5%)
        is_slow_stock = age_days >= SLOW_STOCK_DAYS
        if is_slow_stock:
            resale_price = resale_price * (1.0 - SLOW_STOCK_DISCOUNT)

        resale_price = round(resale_price, 2)

        # Recommended instant buyout quote (Resale * 0.72)
        recommended_purchase_price = round(resale_price * PURCHASE_PRICE_FACTOR, 2)

        # Brokerage Commission Tiers
        tier = (seller_tier or "Everyday Seller").strip()
        if "pro" in tier.lower():
            commission_rate = COMMISSION_PRO        # 5%
        elif "enterprise" in tier.lower() or "workshop" in tier.lower():
            commission_rate = COMMISSION_ENTERPRISE # 3%
        else:
            commission_rate = COMMISSION            # 8%

        commission_amount = round(resale_price * commission_rate, 2)
        seller_payout = recommended_purchase_price

        return {
            "market_base_price_egp": round(base_price, 2),
            "condition_grade": grade,
            "condition_multiplier": multiplier,
            "expected_resale_price": resale_price,
            "recommended_purchase_price": recommended_purchase_price,
            "seller_payout_cash": seller_payout,
            "commission_tier": tier,
            "commission_rate": commission_rate,
            "commission_amount": commission_amount,
            "is_slow_stock": is_slow_stock,
            "applied_discount": SLOW_STOCK_DISCOUNT if is_slow_stock else 0.0
        }

    def _find_base_price(self, category: str, brand_model: str) -> float:
        query = (brand_model or "").lower().strip()
        # Direct exact match
        if query in self.price_matrix:
            return self.price_matrix[query]["market_base_price_egp"]

        # Partial matching within category
        for key, entry in self.price_matrix.items():
            if entry["category"].lower() == category.lower():
                if query in key or any(term in query for term in key.split() if len(term) > 3):
                    return entry["market_base_price_egp"]

        # Default fallbacks by category if brand not found
        defaults = {
            "appliances": 12000.0,
            "electronics": 14000.0,
            "furniture": 15000.0
        }
        return defaults.get(category.lower(), 10000.0)

valuation_engine = ValuationEngineAgent()
