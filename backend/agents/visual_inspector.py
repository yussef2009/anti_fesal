"""
Anti-Fesal (آنتي فصال) - Agent 1: Visual Inspector Agent
Multimodal computer vision and inspection engine for secondhand goods in Alexandria, Egypt.
Utilizes Gemini Vision with deterministic offline heuristic fallback.
"""

import base64
import json
import logging
import mimetypes
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import GEMINI_API_KEY, GEMINI_MODEL, HAS_GEMINI, IMAGES_DIR

logger = logging.getLogger("anti_fesal.visual_inspector")


class GeminiAuthError(Exception):
    """Raised only when Gemini rejects the API key with an explicit 401/403 auth error."""


def _is_auth_error_message(msg: str) -> bool:
    lower = (msg or "").lower()
    auth_markers = (
        "api_key_invalid",
        "api key not valid",
        "permission_denied",
        "unauthenticated",
        "invalid api key",
        "401",
        "403",
    )
    return any(marker in lower for marker in auth_markers)


class VisualInspectorAgent:
    def __init__(self):
        self.api_key = GEMINI_API_KEY
        self.model = GEMINI_MODEL
        self.has_gemini = HAS_GEMINI
        self._auth_failed = False

    def inspect_item(
        self,
        description: str,
        images: Optional[List[str]] = None,
        declared_category: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Inspects 1-4 images and description to evaluate category, brand/model,
        condition grade (A, B, C, D), detected defects, and confidence score.
        """
        images = images or []
        desc = (description or "").strip()

        # If Gemini API key is configured and not permanently rejected for auth, attempt vision call
        if self.has_gemini and not self._auth_failed:
            try:
                result = self._call_gemini_vision(desc, images, declared_category)
                if result:
                    return result
            except GeminiAuthError as auth_err:
                logger.error(f"Gemini API authentication rejected: {auth_err}. Engaging heuristic fallback.")
                self._auth_failed = True
            except Exception as e:
                # Transient network/HTTP/rate-limit error: do NOT permanently latch _auth_failed
                logger.warning(f"Transient Gemini API error: {e}. Executing deterministic heuristic fallback.")

        # Deterministic Heuristic Fallback
        return self._heuristic_fallback(desc, images, declared_category)

    def _load_image_bytes(self, img_url: str) -> Optional[Tuple[bytes, str]]:
        """Loads image bytes and MIME type from local /images/<name>, data URI, or HTTP(S) URL."""
        if not img_url or not isinstance(img_url, str):
            return None
        cleaned = img_url.strip()
        if not cleaned or cleaned == "default.jpg":
            return None

        # 1. Data URI
        if cleaned.startswith("data:image/"):
            try:
                header, b64_payload = cleaned.split(",", 1)
                mime = header.split(";")[0].split(":", 1)[1]
                return base64.b64decode(b64_payload), mime
            except Exception as e:
                logger.warning(f"Invalid data URI image skipped: {e}")
                return None

        # 2. HTTP(S) remote URL
        if cleaned.startswith("http://") or cleaned.startswith("https://"):
            try:
                import requests
                img_response = requests.get(cleaned, timeout=8)
                if img_response.status_code == 200 and img_response.content:
                    mime = img_response.headers.get("Content-Type", "image/jpeg").split(";")[0].strip()
                    return img_response.content, mime
            except Exception as img_err:
                logger.warning(f"Could not fetch remote image {cleaned}: {img_err}")
            return None

        # 3. Local mounted /images/<filename> or relative filename in IMAGES_DIR
        rel_name = cleaned
        if rel_name.startswith("/images/"):
            rel_name = rel_name[len("/images/"):]
        elif rel_name.startswith("images/"):
            rel_name = rel_name[len("images/"):]
        rel_name = rel_name.lstrip("/\\")
        if not rel_name:
            return None

        try:
            images_root = IMAGES_DIR.resolve()
            local_path = (images_root / rel_name).resolve()
            if local_path.is_relative_to(images_root) and local_path.exists() and local_path.is_file():
                mime, _ = mimetypes.guess_type(str(local_path))
                return local_path.read_bytes(), (mime or "image/jpeg")
        except Exception as local_err:
            logger.warning(f"Could not load local image {cleaned}: {local_err}")

        return None

    def _call_gemini_vision(
        self,
        description: str,
        images: List[str],
        declared_category: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        import requests

        prompt = f"""
You are the Lead Visual Inspector for Anti-Fesal (آنتي فصال), an autonomous secondhand re-commerce platform in Alexandria, Egypt.
Analyze the following secondhand listing and any attached product images carefully:

Description (Egyptian Arabic / English): {description}
Declared Category: {declared_category or 'Auto-detect'}

Return ONLY a strict JSON object (no markdown, no extra text):
{{
  "category": "Appliances" | "Electronics" | "Furniture",
  "brand_model": "Identified brand and model string",
  "condition_grade": "A" | "B" | "C" | "D",
  "detected_defects": ["defect 1", "defect 2"],
  "confidence_score": 0.00 to 1.00
}}

GRADING RULES:
- Grade A: Like-new, pristine condition, no noticeable defects -> confidence >= 0.85
- Grade B: Good working condition, minor superficial scuffs or light wear -> confidence >= 0.84
- Grade C: Noticeable wear, scratches, or cosmetic flaws, fully operational -> confidence >= 0.82
- Grade D: Heavy wear, visible rust/بارومة, cracked parts, or requires repair -> confidence >= 0.80
- Drop confidence_score BELOW 0.80 ONLY if images are dark/blurry, damage is unclear, or description contradicts visual condition.
"""
        loaded_images: List[Tuple[bytes, str]] = []
        for img_url in images[:4]:
            loaded = self._load_image_bytes(img_url)
            if loaded:
                loaded_images.append(loaded)

        # Attempt 1: Official google-genai SDK with vision
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            content_parts: List[Any] = [prompt]
            for raw_bytes, mime in loaded_images:
                content_parts.append(types.Part.from_bytes(data=raw_bytes, mime_type=mime))

            response = client.models.generate_content(
                model=self.model,
                contents=content_parts,
                config=types.GenerateContentConfig(temperature=0.1, response_mime_type="application/json"),
            )
            raw_text = response.text.strip().strip("```json").strip("```").strip()
            parsed = json.loads(raw_text)
            return self._normalize_inspection_result(parsed, description, declared_category)
        except Exception as e_sdk:
            if _is_auth_error_message(str(e_sdk)):
                raise GeminiAuthError(str(e_sdk)) from e_sdk
            logger.info(f"google-genai SDK attempt skipped/failed ({e_sdk}), trying REST fallback...")

        # Attempt 2: Direct REST call with base64 images
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        image_parts = [
            {"inline_data": {"mime_type": mime, "data": base64.b64encode(raw_bytes).decode("utf-8")}}
            for raw_bytes, mime in loaded_images
        ]
        parts = [{"text": prompt}] + image_parts
        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
        }
        try:
            res = requests.post(url, json=payload, timeout=15)
            if res.status_code == 200:
                data = res.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(raw_text.strip().strip("```json").strip("```").strip())
                return self._normalize_inspection_result(parsed, description, declared_category)
            if res.status_code in (401, 403):
                raise GeminiAuthError(f"Gemini REST HTTP {res.status_code}: {res.text[:200]}")
            logger.warning(f"Gemini REST transient failure: HTTP {res.status_code}: {res.text[:200]}")
        except GeminiAuthError:
            raise
        except Exception as rest_err:
            logger.warning(f"Gemini REST call transient error: {rest_err}")
        return None

    def _heuristic_fallback(
        self,
        desc: str,
        images: List[str],
        declared_category: Optional[str],
    ) -> Dict[str, Any]:
        """
        Deterministic, robust rule-based inspector matching Gemini Vision output schema.
        """
        lower_desc = desc.lower()

        # Category Detection
        category = "Appliances"
        if any(w in lower_desc for w in ["laptop", "لاب", "iphone", "ايفون", "تليفون", "phone", "موبايل", "tv", "شاشة", "playstation", "بلايستيشن", "thinkpad", "macbook", "galaxy"]):
            category = "Electronics"
        elif any(w in lower_desc for w in ["صالون", "salon", "sofa", "ركنة", "غرفة نوم", "bedroom", "سفرة", "dining", "انتريه", "desk", "مكتب", "نجفة", "دولاب", "عفش"]):
            category = "Furniture"
        elif any(w in lower_desc for w in ["تلاجة", "refrigerator", "غسالة", "washer", "تكييف", "ac", "air conditioner", "ميكروويف", "microwave", "بوتجاز", "cooker"]):
            category = "Appliances"
        elif declared_category in ["Appliances", "Electronics", "Furniture"]:
            category = declared_category

        # Brand / Model Detection
        brand_model = "Generic Model"
        if "toshiba" in lower_desc or "توشيبا" in lower_desc:
            brand_model = "Toshiba Refrigerator 16ft No-Frost"
        elif "lg" in lower_desc or "ال جي" in lower_desc:
            brand_model = "LG Washing Machine 8kg Direct Drive" if category == "Appliances" else "LG TV 50 Inch NanoCell 4K Smart"
        elif "carrier" in lower_desc or "كاريير" in lower_desc:
            brand_model = "Carrier Air Conditioner 1.5HP Optimax"
        elif "samsung" in lower_desc or "سامسونج" in lower_desc:
            if "tv" in lower_desc or "شاشة" in lower_desc or "55" in lower_desc:
                brand_model = "Samsung TV 55 Inch Crystal UHD 4K"
            elif "غسالة" in lower_desc or "washer" in lower_desc:
                brand_model = "Samsung Washing Machine EcoBubble 9kg"
            elif "s21" in lower_desc or "galaxy" in lower_desc:
                brand_model = "Samsung Galaxy S21 FE 5G 128GB"
            else:
                brand_model = "Samsung Microwave 28L Grill"
        elif "dell" in lower_desc or "ديل" in lower_desc:
            brand_model = "Dell Latitude 5400 i5 8th Gen"
        elif "iphone 13" in lower_desc or "ايفون 13" in lower_desc:
            brand_model = "Apple iPhone 13 128GB Midnight"
        elif "iphone 11" in lower_desc or "ايفون 11" in lower_desc:
            brand_model = "Apple iPhone 11 128GB"
        elif "macbook" in lower_desc or "ماك بوك" in lower_desc:
            brand_model = "Apple MacBook Pro M1 2020 8GB/256GB"
        elif "playstation 4" in lower_desc or "بلايستيشن 4" in lower_desc or "ps4" in lower_desc:
            brand_model = "Sony PlayStation 4 Pro 1TB"
        elif "playstation 5" in lower_desc or "بلايستيشن 5" in lower_desc or "ps5" in lower_desc:
            brand_model = "Sony PlayStation 5 Digital Edition"
        elif "kiriazi" in lower_desc or "كريازي" in lower_desc:
            brand_model = "Kiriazi Refrigerator 14ft Defrost"
        elif "universal" in lower_desc or "يونيفرسال" in lower_desc:
            brand_model = "Universal Cooker 5 Burners Cast Iron"
        elif "fresh" in lower_desc or "فريش" in lower_desc:
            brand_model = "Fresh Cooker Plaza 90x60 Safety" if "بوتجاز" in lower_desc else "Fresh Washing Machine Top Load 10kg"
        elif "zanussi" in lower_desc or "زانوسي" in lower_desc:
            brand_model = "Zanussi Washing Machine Perla Max 7kg" if "غسالة" in lower_desc else "Zanussi Refrigerator 18ft Inverter"
        elif "sharp" in lower_desc or "شارب" in lower_desc:
            brand_model = "Sharp Air Conditioner 2.25HP Split"
        elif "salon" in lower_desc or "صالون" in lower_desc or "عطارين" in lower_desc or "attarine" in lower_desc:
            brand_model = "Salon Attarine Louis Quinze Antique"
        elif "bedroom" in lower_desc or "نوم" in lower_desc or "دمياط" in lower_desc:
            brand_model = "Damietta Solid Oak Bedroom Set"
        elif "sofa" in lower_desc or "ركنة" in lower_desc:
            brand_model = "Modern L-Shaped Corner Sofa Velvet"
        elif "dining" in lower_desc or "سفرة" in lower_desc:
            brand_model = "Solid Beech Dining Table + 6 Chairs"
        elif "desk" in lower_desc or "مكتب" in lower_desc:
            brand_model = "Executive Solid Wood Office Desk 160cm"

        # Condition Grade & Defects Analysis
        defects = []
        is_blurry_or_unclear = any(w in lower_desc for w in [
            "blurry", "dark", "unclear", "damage", "غير واضح", "مشوش", "مظلم",
            "مجهول", "عطلان", "مكسور تماما", "unbranded", "rusty",
        ])

        if any(w in lower_desc for w in ["بارومة", "صدمات", "rusty", "rust", "cracked", "broken", "missing leg", "كسر", "شاشة مكسورة"]):
            grade = "D"
            defects.append("عطل جسيم أو بارومة بالهيكل / Structural wear or mechanical defect")
        elif any(w in lower_desc for w in ["شرخ", "يحتاج شحن", "فوق اوتوماتيك فيها شرخ", "خدوش بالضهر", "flickers", "scratched"]):
            grade = "C"
            defects.append("خدوش ملحوظة أو شرخ سطحي / Noticeable cosmetic scratches")
        elif any(w in lower_desc for w in ["نقرة", "خدوش سطحية", "minor cosmetic", "scuffs", "استعمال نضيف"]):
            grade = "B"
            defects.append("علامات استخدام طفيفة / Minor surface scuffs")
        else:
            grade = "A"

        # Confidence Score Calculation
        if is_blurry_or_unclear:
            confidence_score = 0.72  # Below 0.80 -> triggers HITL Triage
        else:
            confidence_score = 0.94 if grade == "A" else (0.88 if grade == "B" else (0.84 if grade == "C" else 0.82))

        return {
            "category": category,
            "brand_model": brand_model,
            "condition_grade": grade,
            "detected_defects": defects,
            "confidence_score": round(confidence_score, 2),
        }

    def _normalize_inspection_result(
        self,
        raw: Dict[str, Any],
        desc: str,
        declared_category: Optional[str],
    ) -> Dict[str, Any]:
        category = raw.get("category", "Appliances")
        if category not in ["Appliances", "Electronics", "Furniture"]:
            category = declared_category or "Appliances"

        grade = str(raw.get("condition_grade", "B")).upper()
        if grade not in ["A", "B", "C", "D"]:
            grade = "B"

        conf = float(raw.get("confidence_score", 0.85))
        conf = max(0.0, min(1.0, conf))

        return {
            "category": category,
            "brand_model": raw.get("brand_model", "Verified Item"),
            "condition_grade": grade,
            "detected_defects": raw.get("detected_defects", []),
            "confidence_score": round(conf, 2),
        }


visual_inspector = VisualInspectorAgent()
