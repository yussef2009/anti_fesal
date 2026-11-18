"""
Anti-Fesal (آنتي فصال) - Workflow 1: Intake & Automated Triage
Connects Agent 1 (Visual Inspector) and Agent 2 (Valuation Engine).
Auto-approves listings with confidence >= 0.80; routes < 0.80 to Human-In-The-Loop (HITL) triage.
Logs execution latency to logs/automation_log.csv.
"""

import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import CONFIDENCE_THRESHOLD
from backend.agents.visual_inspector import visual_inspector
from backend.agents.valuation_engine import valuation_engine
from backend.db_adapter import db
from logs.logger import log_automation

logger = logging.getLogger("anti_fesal.workflow_1_intake")

class IntakeWorkflow:
    def process_intake(self, title: str, description: str, district: str,
                       seller_phone: str, seller_tier: str = "Everyday Seller",
                       image_urls: Optional[List[str]] = None,
                       declared_category: Optional[str] = None,
                       seller_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes end-to-end seller intake workflow:
        1. Agent 1 visual inspection + defect & grade scoring
        2. Agent 2 price matrix valuation + commission lock
        3. Confidence evaluation (>= 0.80 -> AUTO_APPROVED, < 0.80 -> PENDING_REVIEW)
        4. Persistence to database
        5. Thread-safe execution latency logging
        """
        start_time = time.time()
        item_id = f"AF-{uuid.uuid4().hex[:6].upper()}"
        images = image_urls or []

        # Step 1: Agent 1 Visual Inspection
        inspection = visual_inspector.inspect_item(
            description=description,
            images=images,
            declared_category=declared_category
        )

        category = inspection["category"]
        brand_model = inspection["brand_model"]
        condition_grade = inspection["condition_grade"]
        defects = inspection["detected_defects"]
        confidence_score = inspection["confidence_score"]

        # Step 2: Agent 2 Valuation & Commission Computation
        valuation = valuation_engine.value_item(
            category=category,
            brand_model=brand_model,
            condition_grade=condition_grade,
            seller_tier=seller_tier
        )

        # Step 3: Triage Rule based on 0.80 threshold
        if confidence_score >= CONFIDENCE_THRESHOLD:
            status = "AUTO_APPROVED"
            triage_decision = "AUTO_APPROVED"
            triage_notes = f"High confidence ({confidence_score:.2f} >= {CONFIDENCE_THRESHOLD:.2f}). Direct feed publication."
        else:
            status = "PENDING_REVIEW"
            triage_decision = "HITL_TRIAGE_REQUIRED"
            triage_notes = f"Low confidence ({confidence_score:.2f} < {CONFIDENCE_THRESHOLD:.2f}) due to ambiguous defects/photos. Routed to Merchant Review Queue."

        # Step 4: Persist to DB
        item_data = {
            "id": item_id,
            "title": title or brand_model,
            "category": category,
            "brand_model": brand_model,
            "description": description,
            "district": district,
            "seller_phone": seller_phone,
            "seller_tier": seller_tier,
            "seller_id": seller_id or "",
            "image_urls": images,
            "condition_grade": condition_grade,
            "detected_defects": defects,
            "confidence_score": confidence_score,
            "expected_resale_price": valuation["expected_resale_price"],
            "recommended_purchase_price": valuation["recommended_purchase_price"],
            "commission_rate": valuation["commission_rate"],
            "commission_amount": valuation["commission_amount"],
            "status": status
        }
        db.insert_item(item_data)

        elapsed_ms = (time.time() - start_time) * 1000

        # Step 5: Log to automation_log.csv
        log_automation(
            event_type="INTAKE_WORKFLOW_1",
            item_id=item_id,
            execution_time_ms=elapsed_ms,
            status=status,
            details=f"Grade: {condition_grade}, Conf: {confidence_score:.2f}, Resale: {valuation['expected_resale_price']} EGP, Decision: {triage_decision}"
        )

        return {
            "item_id": item_id,
            "status": status,
            "triage_decision": triage_decision,
            "triage_notes": triage_notes,
            "confidence_score": confidence_score,
            "condition_grade": condition_grade,
            "detected_defects": defects,
            "category": category,
            "brand_model": brand_model,
            "expected_resale_price": valuation["expected_resale_price"],
            "recommended_purchase_price": valuation["recommended_purchase_price"],
            "seller_payout_cash": valuation["seller_payout_cash"],
            "commission_tier": valuation["commission_tier"],
            "commission_rate": valuation["commission_rate"],
            "commission_amount": valuation["commission_amount"],
            "execution_time_ms": round(elapsed_ms, 2)
        }

workflow_intake = IntakeWorkflow()
