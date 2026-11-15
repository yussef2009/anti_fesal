"""
Anti-Fesal - Tool and Credential Diagnostic Script
Tests all 5 credentials in .env against their live cloud endpoints.
"""

import os
import requests
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

def test_all():
    print("=" * 60)
    print(" ANTI-FESAL (آنتي فصال) - LIVE CLOUD CREDENTIALS AUDIT")
    print("=" * 60)

    # 1. Gemini
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    print(f"\n[1] Google AI Studio Gemini:")
    if not gemini_key:
        print("    Status: EMPTY -> Using Heuristic Fallback")
    else:
        print(f"    Key prefix: {gemini_key[:8]}...")
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            res = client.models.generate_content(model="gemini-3.5-flash-lite", contents="Hello Anti-Fesal")
            print("    ✓ Status: SUCCESS (Gemini Live AI Connected & Responding via google-genai!)")
        except Exception as e:
            print(f"    ✗ Connection Error: {e}")

    # 2. MongoDB Atlas
    mongo_uri = os.getenv("MONGODB_URI", "")
    print(f"\n[2] MongoDB Atlas:")
    if not mongo_uri:
        print("    Status: EMPTY -> Using Embedded SQLite (data/antifesal.db)")
    elif "<db_password>" in mongo_uri:
        print("    ✗ Status: PLACEHOLDER DETECTED!")
        print("    Reason: The URI still contains '<db_password>'. Please replace it with your MongoDB database user password.")
        print("    Active Fallback: SQLite is currently protecting the system from crashing.")
    else:
        try:
            import pymongo
            client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
            client.admin.command("ping")
            print("    ✓ Status: SUCCESS (MongoDB Atlas Cloud Cluster Connected!)")
        except Exception as e:
            print(f"    ✗ Connection Error: {e}")
            print("    Active Fallback: SQLite is active.")

    # 3. Appwrite
    endpoint = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
    proj = os.getenv("APPWRITE_PROJECT_ID", "")
    bucket = os.getenv("APPWRITE_BUCKET_ID", "")
    key = os.getenv("APPWRITE_API_KEY", "")
    print(f"\n[3] Appwrite Cloud Storage:")
    if not (proj and bucket and key):
        print("    Status: INCOMPLETE -> Using Local Disk (/images/)")
    else:
        headers = {"X-Appwrite-Project": proj, "X-Appwrite-Key": key}
        try:
            res = requests.get(f"{endpoint}/storage/buckets/{bucket}", headers=headers, timeout=6)
            if res.status_code in (200, 201):
                print(f"    ✓ Status: SUCCESS (Appwrite Bucket '{bucket}' Connected!)")
            else:
                print(f"    ✗ Status: HTTP {res.status_code}")
                print(f"    Response: {res.text[:180]}")
                print("    Active Fallback: Local disk storage is active.")
        except Exception as e:
            print(f"    ✗ Connection Error: {e}")

    # 4. Clerk Auth
    jwks_url = os.getenv("CLERK_JWKS_URL", "")
    clerk_sec = os.getenv("CLERK_SECRET_KEY", "")
    print(f"\n[4] Clerk Authentication:")
    if not (jwks_url and clerk_sec):
        print("    Status: EMPTY -> Dev Role Switcher Active")
    else:
        try:
            j_res = requests.get(jwks_url, timeout=6)
            c_res = requests.get("https://api.clerk.com/v1/users?limit=1", headers={"Authorization": f"Bearer {clerk_sec}"}, timeout=6)
            if j_res.status_code == 200 and c_res.status_code == 200:
                print("    ✓ Status: SUCCESS (Clerk JWKS & Backend Secret Key Verified!)")
            elif j_res.status_code == 200:
                print(f"    ✓ JWKS: Valid (HTTP 200) | Secret Key Status: HTTP {c_res.status_code}")
            else:
                print(f"    ✗ JWKS HTTP {j_res.status_code} | API HTTP {c_res.status_code}")
        except Exception as e:
            print(f"    ✗ Connection Error: {e}")

    # 5. Datadog
    dd_key = os.getenv("DD_API_KEY", "")
    dd_site = os.getenv("DD_SITE", "us5.datadoghq.com")
    print(f"\n[5] Datadog US5 APM & LLM Obs:")
    if not dd_key:
        print("    Status: EMPTY -> Local CSV Logging Active")
    else:
        try:
            dd_res = requests.get(f"https://api.{dd_site}/api/v1/validate", headers={"DD-API-KEY": dd_key}, timeout=6)
            if dd_res.status_code == 200 and dd_res.json().get("valid") is True:
                print("    ✓ Status: SUCCESS (Datadog US5 API Key is Valid & Active!)")
            else:
                print(f"    ✗ Status: HTTP {dd_res.status_code}, Response: {dd_res.text[:180]}")
        except Exception as e:
            print(f"    ✗ Connection Error: {e}")

    print("\n" + "=" * 60 + "\n")

if __name__ == "__main__":
    test_all()
