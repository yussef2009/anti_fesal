"""
Anti-Fesal (آنتي فصال) - Workflow 3: Settlement, Commission Lock & Driver Trigger
Executes deal closure upon buyer acceptance:
1. Guards against double-settlement on DISPATCHED / SOLD / REJECTED items.
2. Atomically transitions inventory state to 'DISPATCHED' and locks commission in deals ledger.
3. Triggers Agent 3 (Dispatch Agent) with fault-tolerant driver pickup assignment.
4. Stores separated pickup_address and delivery_address / delivery_district.
5. Logs settlement event to logs/automation_log.csv.
"""

import logging
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import ALEXANDRIA_DISTRICTS
from backend.db_adapter import db
from backend.agents.dispatch_agent import dispatch_agent
from logs.logger import log_automation

logger = logging.getLogger("anti_fesal.workflow_3_settlement")

_AR_DISTRICT_ALIASES = {
    "العطارين": "El-Attarine",
    "المنشية": "El-Mansheya",
    "سيدي بشر": "Sidi Beshr",
    "محرم بك": "Moharam Bek",
    "سموحة": "Smouha",
    "ميامي": "Miami",
    "لوران": "Loran",
    "جليم": "Gleem",
    "رشدي": "Roushdy",
}


class ItemAlreadySettledError(Exception):
    """Raised when attempting to settle an item that is already DISPATCHED, SOLD, or REJECTED."""


def infer_alexandria_district(text: Optional[str]) -> Optional[str]:
    """Infers canonical Alexandria district name from an English or Arabic address string."""
    if not text:
        return None
    lower_text = text.lower()
    for district in ALEXANDRIA_DISTRICTS:
        if district.lower() in lower_text:
            return district
    for ar_name, canonical in _AR_DISTRICT_ALIASES.items():
        if ar_name in text:
            return canonical
    return None


class SettlementWorkflow:
    def close_deal_and_dispatch(
        self,
        item_id: str,
        buyer_id: str,
        agreed_price: Optional[float] = None,
        pickup_address: Optional[str] = None,
        delivery_address: Optional[str] = None,
        delivery_district: Optional[str] = None,
        simulate_dispatch_failure: bool = False,
    ) -> Dict[str, Any]:
        start_time = time.time()
        item = db.get_item_by_id(item_id)
        if not item:
            raise ValueError(f"Item {item_id} not found in database.")

        current_status = (item.get("status") or "").strip().upper()
        if current_status in ("DISPATCHED", "SOLD", "REJECTED"):
            raise ItemAlreadySettledError(
                f"Item {item_id} is already {current_status} and cannot be settled again."
            )

        # Atomic status guard against concurrent settlement races
        if not db.claim_item_for_settlement(item_id):
            raise ItemAlreadySettledError(
                f"Item {item_id} is already DISPATCHED or SOLD and cannot be settled again."
            )

        # Determine price and commission
        final_price = float(agreed_price if agreed_price is not None else (item.get("expected_resale_price") or 0.0))
        comm_rate = float(item.get("commission_rate") if item.get("commission_rate") is not None else 0.08)
        commission_locked = round(final_price * comm_rate, 2)
        seller_payout_cash = float(item.get("recommended_purchase_price") or round(final_price * 0.72, 2))

        deal_id = f"DEAL-{uuid.uuid4().hex[:6].upper()}"

        # 1. Lock commission in Deals ledger
        deal_record = {
            "id": deal_id,
            "item_id": item_id,
            "seller_id": item.get("seller_id") or item.get("seller_phone", "Anonymous Seller"),
            "buyer_id": buyer_id,
            "agreed_price": final_price,
            "commission_locked": commission_locked,
            "status": "COMMISSION_LOCKED",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        db.insert_deal(deal_record)

        # 2. Resolve pickup vs delivery locations cleanly (preserving backward compat for pickup_address)
        pickup_district = item.get("district", "El-Attarine")
        if delivery_address:
            resolved_pickup_address = pickup_address or f"موقع استلام البائع — منطقة {pickup_district}، الإسكندرية"
            resolved_delivery_address = delivery_address
        elif pickup_address and buyer_id != "Platform_Instant_Buyout":
            # Legacy buyer reservation payload passed buyer's address in pickup_address
            resolved_delivery_address = pickup_address
            resolved_pickup_address = f"موقع استلام البائع — منطقة {pickup_district}، الإسكندرية"
        else:
            resolved_pickup_address = pickup_address or f"شارع جمال عبد الناصر، منطقة {pickup_district}، الإسكندرية"
            resolved_delivery_address = f"منطقة {delivery_district or pickup_district}، الإسكندرية"

        resolved_delivery_district = (
            (delivery_district or "").strip()
            or infer_alexandria_district(resolved_delivery_address)
            or pickup_district
        )

        # 3. Trigger Agent 3 (Driver Dispatch)
        dispatch_result = dispatch_agent.dispatch_pickup(
            item_id=item_id,
            district=pickup_district,
            pickup_address=resolved_pickup_address,
            payout_cash=seller_payout_cash,
            deal_id=deal_id,
            simulate_failure=simulate_dispatch_failure,
        )

        # Match assigned driver ID from fleet directory if present
        matched_driver_id = ""
        assigned_name = dispatch_result.get("driver_name", "")
        assigned_phone = dispatch_result.get("driver_phone", "")
        for drv in db.get_drivers():
            if (assigned_phone and drv.get("phone") == assigned_phone) or (
                assigned_name and drv.get("name") == assigned_name
            ):
                matched_driver_id = drv.get("id", "")
                break

        initial_step = "DRIVER_ASSIGNED" if dispatch_result.get("status") == "DISPATCH_SUCCESS" else "ORDER_PLACED"

        # 4. Save dispatch record to DB
        dispatch_db_record = {
            "id": dispatch_result.get("dispatch_id", f"DISP-{uuid.uuid4().hex[:6].upper()}"),
            "deal_id": deal_id,
            "item_id": item_id,
            "district": pickup_district,
            "pickup_address": resolved_pickup_address,
            "delivery_address": resolved_delivery_address,
            "delivery_district": resolved_delivery_district,
            "driver_id": matched_driver_id,
            "driver_name": assigned_name or "Pending",
            "driver_phone": assigned_phone,
            "driver_vehicle": dispatch_result.get("driver_vehicle", ""),
            "payout_cash": seller_payout_cash,
            "retry_count": dispatch_result.get("attempts_taken", 1) - 1,
            "status": dispatch_result.get("status", "PENDING"),
            "current_step": initial_step,
        }
        db.insert_dispatch(dispatch_db_record)

        dispatch_result["delivery_address"] = resolved_delivery_address
        dispatch_result["delivery_district"] = resolved_delivery_district
        dispatch_result["current_step"] = initial_step

        elapsed_ms = (time.time() - start_time) * 1000

        # 5. Log to automation_log.csv
        log_automation(
            event_type="SETTLEMENT_WORKFLOW_3",
            item_id=item_id,
            execution_time_ms=elapsed_ms,
            status=dispatch_result.get("status", "SUCCESS"),
            details=f"Deal: {deal_id}, Price: {final_price} EGP, Comm Locked: {commission_locked} EGP, Driver: {dispatch_result.get('driver_name')}",
        )

        return {
            "success": True,
            "deal_id": deal_id,
            "item_id": item_id,
            "agreed_price": final_price,
            "commission_locked": commission_locked,
            "seller_payout_cash": seller_payout_cash,
            "deal_status": "COMMISSION_LOCKED",
            "delivery_address": resolved_delivery_address,
            "delivery_district": resolved_delivery_district,
            "dispatch": dispatch_result,
            "execution_time_ms": round(elapsed_ms, 2),
        }


workflow_settlement = SettlementWorkflow()
