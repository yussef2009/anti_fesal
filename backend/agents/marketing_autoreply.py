"""
Anti-Fesal (آنتي فصال) - Agent 4: Marketing & 24/7 Auto-Reply Bot
Generates localized Egyptian Arabic & English social posts with 'Verified Grade • Fixed Price - No Fesal' badges.
Provides lightning-fast (<2s) intelligent anti-haggling customer auto-replies with direct reservation links.
"""

import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict
from urllib.parse import quote

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import CUSTOM_DOMAIN

logger = logging.getLogger("anti_fesal.marketing_autoreply")


def _build_reservation_link(item_id: str) -> str:
    domain = (CUSTOM_DOMAIN or "anti-fesal.me").strip() or "anti-fesal.me"
    safe_id = quote(str(item_id or "AF-0000"), safe="")
    return f"https://{domain}/#reserve?id={safe_id}"


def _is_item_slow_stock(item: Dict[str, Any]) -> bool:
    created_at_str = item.get("created_at")
    if not created_at_str:
        return False
    try:
        clean_date = str(created_at_str).replace("Z", "")
        item_date = datetime.fromisoformat(clean_date)
        return (datetime.utcnow() - item_date).days >= 14
    except Exception:
        return False


class MarketingAutoReplyAgent:
    def __init__(self):
        pass

    def generate_ad_copy(self, item: Dict[str, Any]) -> Dict[str, str]:
        """
        Generates ready-to-publish social ad copy formatted for Facebook Marketplace,
        Instagram Stories, and WhatsApp Catalog.
        """
        title = item.get("title", "منتج مميز")
        brand = item.get("brand_model", "")
        grade = item.get("condition_grade", "A")
        price = float(item.get("expected_resale_price") or 0.0)
        district = item.get("district", "الإسكندرية")
        item_id = item.get("id", "AF-0000")
        defects = item.get("detected_defects", [])
        reservation_link = _build_reservation_link(item_id)

        defect_str = "لا توجد عيوب تذكر" if not defects else "، ".join(defects)
        is_slow_stock = _is_item_slow_stock(item)

        slow_stock_badge = (
            "🔥 [عرض حصري: تم تطبيق خصم 5% تلقائي على هذا المنتج لتسريع حركة المخزون!]"
            if is_slow_stock
            else ""
        )

        # 1. Facebook Marketplace Post
        facebook_copy = f"""⚡ معروض للبيع في الإسكندرية ({district}) | منصة آنتي فصال ⚡
🏷️ {title}
{slow_stock_badge}
💎 الحالة: الفئة {grade} (مفحوص بالذكاء الاصطناعي ومعتمد)
🔍 كشف العيوب: {defect_str}
💰 السعر النهائي: {price:,.0f} جنيه مصري (سعر قطعي ومضمون • بدون وجع فصال)
📍 الاستلام: {district} - الإسكندرية (أو شحن مع مندوبنا المعتمد حتى باب بيتك)
🚚 خدمة الدفع كاش عند المعاينة بعد التأكد من سلامة المنتج 100%

🔗 كود الحجز الفوري: {item_id}
رابط الشراء المباشر: {reservation_link}

#آنتي_فصال #أجهزة_مستعملة_الإسكندرية #سعّر_بيع_بدون_وجع_فصال #{district.replace('-', '_')}"""

        # 2. Instagram Story Caption
        instagram_copy = f"""✨ {brand or title} ✨
🛡️ كشف AI معتمد: درجة {grade}
🚫 ودّع الفصال والمماطلة!
💵 {price:,.0f} EGP فقط — سعر عادل ونهائي
📍 متاح في {district}، الإسكندرية
📲 للحجز الفوري ومعاينة تقرير الفحص: {reservation_link}"""

        # 3. WhatsApp Catalog Description
        whatsapp_copy = f"""*آنتي فصال - كتالوج الإسكندرية المعتمد*
📦 المنتج: {title} ({brand})
🏷️ الكود: #{item_id}
⭐ الحالة: درجة {grade} (فحص موثّق)
💰 السعر الثابت: {price:,.0f} ج.م (شامل المعاينة)
📍 الموقع: {district}
🛒 للحجز الفوري والتوصيل: {reservation_link}"""

        return {
            "facebook_marketplace": facebook_copy,
            "instagram_story": instagram_copy,
            "whatsapp_catalog": whatsapp_copy,
            "reservation_link": reservation_link,
        }

    def autoreply(self, item: Dict[str, Any], buyer_message: str) -> Dict[str, Any]:
        """
        Answers buyer questions in < 2 seconds, politely deflecting lowball haggling
        and guiding to the direct reservation checkout.
        """
        start_time = time.time()
        msg = (buyer_message or "").strip().lower()

        title = item.get("title", "المنتج")
        price = float(item.get("expected_resale_price") or 0.0)
        grade = item.get("condition_grade", "A")
        district = item.get("district", "الإسكندرية")
        status = (item.get("status") or "AUTO_APPROVED").upper()
        item_id = item.get("id", "AF-0000")
        reservation_link = _build_reservation_link(item_id)

        # 1. Haggling / Lowball Intent Detection
        haggling_keywords = [
            "تفاوض", "فصال", "تنزيل", "نزل", "اخرها", "آخرها", "هتخلص", "تخلص بكام", "تخلص بكام؟",
            "نهائي", "اقل", "أقل", "ارخص", "discount", "negotiate", "less", "offer",
        ]
        is_haggling = any(kw in msg for kw in haggling_keywords)

        is_slow_stock = _is_item_slow_stock(item)
        slow_stock_note = (
            " (علماً بأنه تم تطبيق خصم 5% تلقائياً لتسريع حركة المخزون)"
            if is_slow_stock
            else ""
        )

        # 2. Price Inquiry Intent
        price_keywords = ["بكام", "السعر", "سعره", "سعرها", "تكلفة", "بكام؟", "price", "how much", "cost"]
        is_price_inquiry = any(kw in msg for kw in price_keywords)

        # 3. Availability Inquiry Intent
        availability_keywords = ["موجود", "متاح", "لسه", "موجود؟", "متاحة", "available", "still"]
        is_availability = any(kw in msg for kw in availability_keywords)

        # 4. Location Inquiry Intent
        location_keywords = ["فين", "مكان", "عنوان", "العنوان", "المنطقة", "location", "address", "where"]
        is_location = any(kw in msg for kw in location_keywords)

        if is_haggling:
            intent = "haggling_deflection"
            reply_text = (
                f"أهلاً بك يا فندم في آنتي فصال! 🌟\n"
                f"نظامنا مبني بالذكاء الاصطناعي لتقييم {title} تقييماً عادلاً جداً ({price:,.0f} جنيه){slow_stock_note} "
                f"بناءً على حالة الجهاز الفعلية (الدرجة {grade}).\n"
                f"السعر ده سعر قطعي ومدروس بحيث يوفّر عليك وعلى البائع وجع دماغ ومماطلة الفصال، "
                f"ومعاه ضمان حق المعاينة والتجربة مع المندوب قبل دفع جنيه واحد.\n"
                f"تقدر تحجز المنتج فوراً وتحدد موعد المعاينة من هنا: {reservation_link}"
            )
        elif is_price_inquiry:
            intent = "price_inquiry"
            reply_text = (
                f"يا فندم سعر {title} هو {price:,.0f} جنيه مصري فقط. 🏷️\n"
                f"ده السعر النهائي المعتمد بناءً على فحص الدرجة {grade}، وبدون أي وجع فصال أو مصاريف خفية.\n"
                f"رابط الحجز المباشر: {reservation_link}"
            )
        elif is_availability:
            intent = "availability_inquiry"
            if status in ("SOLD", "DISPATCHED", "REJECTED"):
                reply_text = (
                    f"للأسف يا فندم، تم حجز أو بيع {title} مؤخراً! "
                    f"تابع منصة آنتي فصال لمشاهدة عروض الإسكندرية المتاحة حالياً."
                )
            else:
                reply_text = (
                    f"أيوة يا فندم، {title} متاح حالياً وجاهز للمعاينة الفورية والتسليم في الإسكندرية ({district})! ✅\n"
                    f"تقدر تحجزه منعاً لنفاذه من الرابط: {reservation_link}"
                )
        elif is_location:
            intent = "location_inquiry"
            reply_text = (
                f"المنتج متواجد حالياً في منطقة {district} بالإسكندرية. 📍\n"
                f"نوفر أيضاً إمكانية التوصيل الفوري مع كابتن التوصيل لمعاينة الجهاز واستلامه كاش عند باب بيتك.\n"
                f"لحجز موعد التسليم: {reservation_link}"
            )
        else:
            intent = "general_inquiry"
            reply_text = (
                f"أهلاً بك في منصة آنتي فصال بالإسكندرية! 🌊\n"
                f"{title} معروض بسعر نهائي {price:,.0f} جنيه بحالة ممتازة (الدرجة {grade}).\n"
                f"يسعدنا مساعدتك، ورابط الحجز المباشر هو: {reservation_link}"
            )

        elapsed_ms = (time.time() - start_time) * 1000

        return {
            "intent_detected": intent,
            "buyer_message": buyer_message,
            "reply_text": reply_text,
            "response_time_ms": round(elapsed_ms, 2),
            "reservation_link": reservation_link,
        }


marketing_autoreply = MarketingAutoReplyAgent()
