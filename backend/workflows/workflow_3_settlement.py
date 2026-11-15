"""
Anti-Fesal (آنتي فصال) - Workflow 3: Settlement, Commission Lock & Driver Trigger
Executes deal closure upon buyer acceptance:
1. Locks the brokerage commission in the deals ledger.
2. Updates inventory state to 'DISPATCHED'.
3. Triggers Agent 3 (Dispatch Agent) with fault-tolerant driver pickup assignment.
4. Logs settlement event to logs/automation_log.csv.
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.db_adapter import db
from backend.agents.dispatch_agent import dispatch_agent
from logs.logger import log_automation

logger = logging.getLogger("anti_fesal.workflow_3_settlement")

class SettlementWorkflow:
    def close_deal_and_dispatch(self, item_id: str, buyer_id: str,
                                agreed_price: Optional[float] = None,
                                pickup_address: Optional[str] = None,
                                simulate_dispatch_failure: bool = False) -> Dict[str, Any]:
        start_time = time.time()
        item = db.get_item_by_id(item_id)
        if not item:
            raise ValueError(f"Item {item_id} not found in database.")

        # Determine price and commission
        final_price = agreed_price or item.get("expected_resale_price", 0.0)
        comm_rate = item.get("commission_rate", 0.08)
        commission_locked = round(final_price * comm_rate, 2)
        seller_payout_cash = item.get("recommended_purchase_price") or round(final_price * 0.72, 2)

        deal_id = f"DEAL-{uuid.uuid4().hex[:6].upper()}"

        # 1. Lock commission in Deals ledger
        deal_record = {
            "id": deal_id,
            "item_id": item_id,
            "seller_id": item.get("seller_phone", "Anonymous Seller"),
            "buyer_id": buyer_id,
            "agreed_price": final_price,
            "commission_locked": commission_locked,
            "status": "COMMISSION_LOCKED",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        db.insert_deal(deal_record)

        # 2. Update item status to DISPATCHED
        db.update_item(item_id, {"status": "DISPATCHED"})

        # 3. Trigger Agent 3 (Driver Dispatch)
        district = item.get("district", "El-Attarine")
        resolved_address = pickup_address or f"شارع جمال عبد الناصر، منطقة {district}، الإسكندرية"

        dispatch_result = dispatch_agent.dispatch_pickup(
            item_id=item_id,
            district=district,
            pickup_address=resolved_address,
            payout_cash=seller_payout_cash,
            deal_id=deal_id,
            simulate_failure=simulate_dispatch_failure
        )

        # 4. Save dispatch record to DB
        dispatch_db_record = {
            "id": dispatch_result.get("dispatch_id", f"DISP-{uuid.uuid4().hex[:6].upper()}"),
            "deal_id": deal_id,
            "item_id": item_id,
            "district": district,
            "pickup_address": resolved_address,
            "driver_name": dispatch_result.get("driver_name", "Pending"),
            "driver_phone": dispatch_result.get("driver_phone", ""),
            "payout_cash": seller_payout_cash,
            "retry_count": dispatch_result.get("attempts_taken", 1) - 1,
            "status": dispatch_result.get("status", "PENDING")
        }
        db.insert_dispatch(dispatch_db_record)

        elapsed_ms = (time.time() - start_time) * 1000

        # 5. Log to automation_log.csv
        log_automation(
            event_type="SETTLEMENT_WORKFLOW_3",
            item_id=item_id,
            execution_time_ms=elapsed_ms,
            status=dispatch_result.get("status", "SUCCESS"),
            details=f"Deal: {deal_id}, Price: {final_price} EGP, Comm Locked: {commission_locked} EGP, Driver: {dispatch_result.get('driver_name')}"
        )

        return {
            "success": True,
            "deal_id": deal_id,
            "item_id": item_id,
            "agreed_price": final_price,
            "commission_locked": commission_locked,
            "seller_payout_cash": seller_payout_cash,
            "deal_status": "COMMISSION_LOCKED",
            "dispatch": dispatch_result,
            "execution_time_ms": round(elapsed_ms, 2)
        }

workflow_settlement = SettlementWorkflow()
