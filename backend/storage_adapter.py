"""
Anti-Fesal (آنتي فصال) - Dual-Mode Storage Adapter
Handles product image uploads using Appwrite Cloud Storage (GitHub Student Pack)
with automatic, seamless fallback to local disk storage (data/images/) served via FastAPI static files.
"""

import os
import uuid
import logging
from pathlib import Path
from typing import Tuple, Optional
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import (
    APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_BUCKET_ID,
    APPWRITE_API_KEY, HAS_APPWRITE, IMAGES_DIR
)

logger = logging.getLogger("anti_fesal.storage_adapter")

class StorageAdapter:
    def __init__(self):
        self.mode = "appwrite" if HAS_APPWRITE else "local"
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Storage adapter initialized in '{self.mode}' mode.")

    def save_image(self, file_bytes: bytes, original_filename: str) -> Tuple[str, str]:
        """
        Saves uploaded file bytes to either Appwrite Bucket or local disk.
        Returns: (file_id, public_url)
        """
        # Security: sanitize filename and generate unique identifier
        ext = Path(original_filename).suffix.lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
            ext = ".jpg"
        file_id = f"img_{uuid.uuid4().hex[:12]}{ext}"

        if self.mode == "appwrite":
            try:
                import requests
                headers = {
                    "X-Appwrite-Project": APPWRITE_PROJECT_ID,
                    "X-Appwrite-Key": APPWRITE_API_KEY
                }
                url = f"{APPWRITE_ENDPOINT}/storage/buckets/{APPWRITE_BUCKET_ID}/files"
                files = {
                    "fileId": (None, file_id),
                    "file": (file_id, file_bytes, f"image/{ext.lstrip('.')}")
                }
                resp = requests.post(url, headers=headers, files=files, timeout=5)
                if resp.status_code in (200, 201):
                    public_url = f"{APPWRITE_ENDPOINT}/storage/buckets/{APPWRITE_BUCKET_ID}/files/{file_id}/view?project={APPWRITE_PROJECT_ID}"
                    return file_id, public_url
                else:
                    logger.warning(f"Appwrite upload failed (status {resp.status_code}), falling back to local storage.")
            except Exception as e:
                logger.warning(f"Appwrite upload error: {e}. Falling back to local storage.")

        # Local fallback
        dest_path = IMAGES_DIR / file_id
        # Prevent path traversal
        if not str(dest_path.resolve()).startswith(str(IMAGES_DIR.resolve())):
            file_id = f"safe_{uuid.uuid4().hex[:8]}.jpg"
            dest_path = IMAGES_DIR / file_id

        with open(dest_path, "wb") as f:
            f.write(file_bytes)

        public_url = f"/images/{file_id}"
        return file_id, public_url

    def get_image_path(self, file_id: str) -> Optional[Path]:
        p = IMAGES_DIR / file_id
        if p.exists() and str(p.resolve()).startswith(str(IMAGES_DIR.resolve())):
            return p
        return None

storage = StorageAdapter()
