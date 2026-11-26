# Anti-Fesal (آنتي فصال)

> **"سعّر، بيع، ومن غير وجع فصال"**  
> *Price it, sell it, without the bargaining headache.*

Anti-Fesal is an AI-assisted re-commerce and merchant automation platform engineered for the secondhand marketplace in Alexandria, Egypt. It pairs a Dubizzle-inspired buyer-first storefront with computer-vision-backed condition grading, deterministic fixed-price valuations, human-in-the-loop (HITL) merchant review, 2-step KYC onboarding, live GPS delivery dispatch, cash-on-inspection settlements, and role-based governance.

---

## 🌟 Key Features & Ecosystem Roles

The platform enforces a **strictly role-separated architecture** tailored for the Alexandrian re-commerce market:

### 1. 🛒 Buyer-First Marketplace & PWA Offline Shell (Public Home Page)
- **Dubizzle-Inspired Buyer Experience:** Clean public showroom with zero clutter from internal triage queues or admin/captain gates.
- **Showroom Discovery & Filtering:** Browse inspected and graded **Appliances**, **Electronics**, and **Furniture** across all **9 Alexandria districts**:
  `El-Attarine`, `El-Mansheya`, `Sidi Beshr`, `Moharam Bek`, `Smouha`, `Miami`, `Loran`, `Gleem`, and `Roushdy`.
- **Rich Product Detail View:** List/grid toggle, sorting, saved favorites filter, multi-photo gallery, Fair Price Matrix benchmark bar, seller trust card, and an interactive **Buyer Inspection Checklist** before paying cash.
- **Fixed-Price Protection & AI Compare Assistant:** Reserve immediately with zero bargaining, compare items via `/api/chatbot/compare`, and verify fair pricing in the Alexandria Price Index.
- **Installable Progressive Web App (PWA):** Backed by `frontend/manifest.json`, `frontend/sw.js`, `frontend/icons/`, and `frontend/placeholder.jpg` for app-shell precaching, offline image fallback, offline `/api/*` JSON error responses, and a live connectivity status banner.

### 2. 🏷️ Verified Sellers & 2-Step KYC Onboarding (بائع معتمد)
- **2-Step KYC Application Flow:** Collects identity, phone, National ID, and Alexandria district (Step 1), followed by shop/workshop name, business type (`individual`, `workshop`, `showroom`), commission tier, cash payout wallet, and ID/register upload preview (Step 2) via `POST /api/applications/apply`.
- **Admin Approval & Role Elevation:** Applications enter `PENDING_APPROVAL` and automatically elevate the user's account role upon Admin approval.
- **3-Step Seller AI Studio:** Approved sellers inspect 1–4 item photos using Google Gemini Vision (`gemini-1.5-flash` with heuristic fallback), generate Grade `A–D` condition reports, and receive fixed resale prices and instant buyout quotes (`0.72 × resale`).
- **Subscription Tiers & Trader Studio:** Everyday Seller (`8%`), Pro Trader (`5%`), and Enterprise Showroom (`3%`), plus localized Facebook/Instagram/WhatsApp ad generation, 24/7 anti-haggling auto-replies, and automated 14-day slow-stock (`5%`) markdowns.

### 3. 🚚 Alexandria Delivery Captains (كباتن التوصيل)
- **2-Step Driver KYC with Mandatory GPS Consent:** Collects identity and primary Alexandria district (Step 1), followed by vehicle type (`pickup`, `van`, `tricycle`, `motorcycle`), plate number, license number, document preview, and **mandatory explicit GPS sharing consent** (`consent_location: true`) (Step 2).
- **PIN-Gated Captain Portal (`#delivery` / `#delivery-portal`):** Unlocked via server-side `POST /api/auth/gate` verification against the environment-configured `CAPTAIN_ACCESS_PIN`, issuing a signed `driver` Bearer token.
- **Live GPS Streaming & Task Execution:** Streams device coordinates via `navigator.geolocation.watchPosition` to `POST /api/driver/location`, advances delivery stages, and completes cash-on-inspection settlements.

### 4. 🛣️ Realtime 5-Stage Delivery Road & Interactive Live Map
- **5-Stage Delivery Progression:**
  1. `ORDER_PLACED`: Deal booked and fixed price/commission locked.
  2. `DRIVER_ASSIGNED`: Captain assigned to pickup route.
  3. `PICKED_UP`: Captain collects item from seller and hands over instant cash payout (triggers an automated buyer notification banner).
  4. `OUT_FOR_DELIVERY`: Captain in transit to buyer's district for hands-on inspection.
  5. `DELIVERED_SETTLED`: Buyer inspects item, cash collected, and deal settled.
- **Interactive Leaflet Live Map (with Offline SVG Fallback):** OpenStreetMap tracking displaying seller pickup point, live moving captain pin, buyer delivery address, route polyline, and dynamic Alexandria ETA.

### 5. 🔐 Security, RBAC & Admin Governance Portal (بوابة الإدارة المركزية)
- **Server-Side Auth & Strict RBAC (`AUTH_ENFORCE=1`):** Protected routes require signed HMAC-SHA256 Bearer tokens (`SESSION_SECRET`) or Clerk Cloud JWTs (`CLERK_JWKS_URL`). Public registration (`POST /api/auth/register`) hashes passwords with salted PBKDF2-HMAC-SHA256 and enforces `role: "buyer"`. `X-Dev-Role` header overrides are disabled whenever `AUTH_ENFORCE=1`.
- **Environment-Configured Portal Gates:** Captain and Admin portals (`#delivery` / `#delivery-portal` and `#admin` / `#admin-portal`) verify `CAPTAIN_ACCESS_PIN` and `ADMIN_ACCESS_PIN` server-side via `POST /api/auth/gate` using constant-time `hmac.compare_digest` — no PINs are stored in frontend code or documentation.
- **Admin Governance Dashboard:**
  - **KPIs & Leaderboards:** Total Orders Sold, Gross Merchandise Value (GMV), Net Platform Commission, Driver Cash Payouts, Top Selling Categories, Top Buying Alexandria Districts, and Daily Volume chart.
  - **KYC Verification Desk:** Queue of pending seller and driver applications with 1-click **Approve** or **Reject** actions.
  - **Moderation & Fleet Matrix:** User directory (`ACTIVE` / `BLOCKED`) and live Alexandria driver fleet status (`FREE` / `ON_DELIVERY` / `OFF_DUTY`).

---

## 🏛️ Architecture & Tech Stack

```text
api/
└── index.py              Vercel Serverless Function entrypoint exporting FastAPI app

frontend/
├── index.html            Dubizzle-inspired buyer showroom, 3-step Seller AI Studio, 2-step KYC modals,
│                         Leaflet live map, tracking, account hub, & PIN-gated Captain/Admin portals
├── app.js                SPA routing, HMAC/Bearer auth, state sync, Leaflet map, GPS watchPosition, & AR/EN i18n
├── styles.css            Unified light/dark design tokens, logical RTL/LTR styles, responsive grid/list, 5-step road
├── manifest.json         Progressive Web App manifest (RTL Arabic, installable icons)
├── sw.js                 Service Worker (app-shell precache, offline /api/* JSON fallback, offline image fallback)
├── placeholder.jpg       Default/offline product placeholder image
├── logo.png              Brand mark
└── icons/                PWA icons (icon-192.png, icon-512.png, icon-maskable-512.png)

backend/
├── main.py               FastAPI application, HMAC/Clerk RBAC, portal gates, tracking, GPS, chatbot, & analytics
├── db_adapter.py         Dual-mode MongoDB Atlas client with transparent SQLite fallback
├── storage_adapter.py    Appwrite Cloud Storage with local disk fallback (data/images/ mounted at /images/)
├── agents/               Specialized agentic workers
│   ├── visual_inspector.py    Agent 1: Gemini Vision (gemini-1.5-flash) inspector with heuristic fallback
│   ├── valuation_engine.py    Agent 2: Alexandria district & condition price matrix + commission lock
│   ├── dispatch_agent.py      Agent 3: Alexandria driver routing and exponential backoff retry dispatching
│   └── marketing_autoreply.py Agent 4: Bilingual ad copy generator & <2s anti-haggling auto-reply bot
└── workflows/
    ├── workflow_1_intake.py       Intake, visual inspection, valuation, and confidence-based HITL triage
    ├── workflow_2_catalog_loop.py Daily catalog generation (data/daily_catalog.md) & corrupt-record filter
    └── workflow_3_settlement.py   Double-settlement guard, commission lock, and dispatch trigger

data/
├── init_db.py                      SQLite schema (items, deals, dispatches, trader_rules, users, applications,
│                                   driver_locations), PBKDF2 password hashing, and seed loader
├── price_matrix_alexandria.csv     Alexandria benchmark secondhand valuation matrix
├── test_dataset_50.csv             50-item bilingual accuracy benchmark dataset
├── reliability_test_100.csv        100-item stress & corrupt-row reliability dataset
├── daily_catalog.md                Automated generated daily catalog
└── images/                         Local fallback image storage

logs/
└── logger.py             Thread-safe CSV loggers (automation_log.csv, skipped_items_log.csv, corrections.csv)

tests/
├── check_credentials.py                  Live cloud credential & local fallback diagnostic script
├── test_fault_tolerance.py               Retry backoff (0s -> 3s -> 6s) & DISPATCH_FAILED logging tests
├── test_nfr_accuracy.py                  50-item bilingual inspection & auto-approval threshold benchmarks
├── test_nfr_reliability.py               100-item batch intake reliability & corrupted input tolerance
└── test_role_separation_and_delivery.py  RBAC/auth, gates, KYC onboarding, settlement 409 guard, GPS, & analytics
```

### Dual-Mode Cloud & Local Fallbacks

Anti-Fesal runs out of the box with zero external configuration by engaging transparent local fallbacks:

| Capability | Cloud Integration | Local Fallback |
| :--- | :--- | :--- |
| **AI Appraisal** | Google Gemini Vision (`gemini-1.5-flash` via `GEMINI_MODEL`) | Deterministic Alexandria heuristic engine |
| **Database** | MongoDB Atlas Cluster | Embedded SQLite (`data/antifesal.db`) |
| **Media Storage** | Appwrite Cloud Storage | Local filesystem (`data/images/` mounted at `/images/`) |
| **Auth & RBAC** | Clerk Cloud JWT (`CLERK_JWKS_URL`) | Built-in HMAC-SHA256 Session Auth (`SESSION_SECRET`) & PBKDF2 |
| **Live Map** | Leaflet.js + OpenStreetMap | Static district centroid coordinates & SVG route fallback |
| **Observability** | Datadog US5 APM & LLM Obs | Thread-safe local CSV audit logging (`logs/`) |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (optional, for `npm start` / `npm test` convenience wrappers via `run-dev.js`)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/yussef2009/anti_fesal.git
cd anti_fesal

# 2. Setup virtual environment
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
.venv\Scripts\Activate.ps1

# 3. Install dependencies
python -m pip install -r requirements.txt

# 4. Configure environment (optional locally; defaults to local fallbacks)
cp .env.example .env

# 5. Initialize SQLite database tables & seed data
python data/init_db.py

# 6. Run live credential diagnostics (optional)
python tests/check_credentials.py

# 7. Run the platform
python run.py
# Or using Node.js wrapper:
# npm start
```

Open in your browser:
- **Buyer Marketplace & Showroom:** <http://127.0.0.1:8000>
- **Captain Delivery Portal:** <http://127.0.0.1:8000/#delivery> (authenticated via `CAPTAIN_ACCESS_PIN` on `/api/auth/gate`)
- **Admin Governance Portal:** <http://127.0.0.1:8000/#admin> (authenticated via `ADMIN_ACCESS_PIN` on `/api/auth/gate`)
- **Interactive Swagger API Docs:** <http://127.0.0.1:8000/docs> (ReDoc: `/redoc`, OpenAPI schema: `/openapi.json`)
- **Health Check Endpoint:** <http://127.0.0.1:8000/api/health>

---

## 📡 API Reference

> **RBAC Note:** Protected routes enforce `Authorization: Bearer <token>` when `AUTH_ENFORCE=1` (default), returning `401` if unauthenticated and `403` if the token's role lacks permission.

### Health, Authentication & Account
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Pre-flight status for all 6 integrations, active fallbacks, `auth_enforce`, `db_mode`, and `storage_mode` |
| `POST` | `/api/auth/gate` | Public (PIN) | Validates `portal` (`captain` \| `admin`) against `CAPTAIN_ACCESS_PIN` / `ADMIN_ACCESS_PIN`; returns HMAC Bearer token |
| `POST` | `/api/auth/login` | Public | Standard PBKDF2 login (`username_or_email`, `password`) or Google buyer demo sign-in (`login_type: "google"`) |
| `POST` | `/api/auth/register` | Public | Registers a new account with salted PBKDF2 password hashing (forces `role: "buyer"`) and returns signed token |
| `GET` | `/api/user/account-data` | Authenticated | Strictly scoped seller items, buyer deals, and driver dispatches for the signed-in user |

### Onboarding & KYC Verification Desk
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/applications/apply` | Public / Auth | Submit verified seller or driver KYC application (requires `consent_location: true` for `driver`) |
| `GET` | `/api/applications/my-status` | Public / Auth | Check applicant's current review status (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`) |
| `GET` | `/api/admin/applications` | `admin` | List pending/reviewed applications with optional `status` and `role` filters |
| `POST` | `/api/admin/applications/{app_id}/review` | `admin` | Approve or reject application with admin notes and automated role elevation |

### Marketplace, Intake, Appraisal & HITL Review
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/items` | Public | Query listings with `category`, `district`, `status`, `search`, `limit`, and `offset` filters |
| `GET` | `/api/items/{item_id}` | Public | Fetch single listing details by ID |
| `POST` | `/api/upload` | Public | Upload product image (up to 10 MB) to Appwrite Cloud Storage or local `/images/` fallback |
| `POST` | `/api/intake` | `seller`, `merchant`, `admin` | Workflow 1: Gemini Vision inspection, Alexandria valuation, and confidence triage (`>= 0.80` auto-approved) |
| `POST` | `/api/review/{item_id}` | `merchant`, `admin` | HITL review (`APPROVE`, `ADJUST`, or `REJECT`) with audit logging to `corrections.csv` |
| `POST` | `/api/settle` | Public | Workflow 3: Guards double-settlement (`409`), locks commission, and dispatches driver |
| `GET` | `/api/price-matrix` | Public | Fetch Alexandria benchmark price matrix with Grade `A–D` prices (`category`, `search` filters) |
| `GET` | `/api/trader-rules` | Public | Fetch seller tier commission rates and 14-day slow-stock markdown rules |
| `GET` | `/api/metrics` | Public | Fetch summary marketplace and triage KPI metrics |

### AI Assistant, Marketing & Catalog Automation
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chatbot/compare` | Public | AI product search & 2-item side-by-side comparison (`message`, optional `item_id_1`, `item_id_2`) |
| `POST` | `/api/autoreply` | Public | Agent 4 (<2s) customer Q&A and polite anti-haggling deflection with `#reserve?id=` link |
| `POST` | `/api/marketing/generate` | Public | Generate localized Facebook, Instagram, and WhatsApp ad copy for an approved listing |
| `POST` | `/api/catalog/run` | `merchant`, `admin` | Workflow 2: Compile `data/daily_catalog.md` and log corrupt items to `skipped_items_log.csv` |
| `GET` | `/api/logs/automation` | `merchant`, `admin` | Read `logs/automation_log.csv` audit events |
| `GET` | `/api/logs/skipped` | `merchant`, `admin` | Read `logs/skipped_items_log.csv` filtered-record events |
| `GET` | `/api/logs/corrections` | `merchant`, `admin` | Read `logs/corrections.csv` HITL merchant override records |

### Real-Time Delivery, Dispatches & GPS Tracking
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dispatches` | Public | Return active driver dispatches (JSON array) |
| `POST` | `/api/dispatches/{dispatch_id}/status` | `driver`, `merchant`, `admin` | Update dispatch status (`PENDING`, `DISPATCH_SUCCESS`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`) |
| `POST` | `/api/dispatches/{dispatch_id}/step` | `driver`, `admin` | Advance 5-step delivery road (`ORDER_PLACED` -> `DRIVER_ASSIGNED` -> `PICKED_UP` -> `OUT_FOR_DELIVERY` -> `DELIVERED_SETTLED`) |
| `GET` | `/api/dispatches/{dispatch_id}/live-tracking` | Public | Fetch 5-step delivery road stage, pickup/delivery/driver coordinates, `gps_live`, and Alexandria ETA |
| `POST` | `/api/driver/location` | `driver`, `admin` | Driver streams live device GPS coordinates (`lat`, `lng`, `heading`, `sharing_enabled`) |
| `GET` | `/api/track/{query}` | Public | Track order by exact deal/dispatch/item ID or normalized phone |

### Admin Governance, Users & Fleet Management
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/analytics` | `admin` | Orders sold, top categories breakdown, top buying Alexandria districts, GMV, commission, and payouts |
| `GET` | `/api/admin/financials` | `admin` | Platform GMV, net commission, driver cash payouts, user counts, and daily `time_series` |
| `GET` | `/api/admin/users` | `admin` | Platform user directory (password hashes omitted) |
| `POST` | `/api/admin/users/{user_id}/status` | `admin` | Activate or block a user account (`ACTIVE` \| `BLOCKED`) |
| `GET` | `/api/admin/drivers` | `admin` | Driver fleet list with `completed_trips`, `status`, `district`, `vehicle_type`, and `rating` |
| `POST` | `/api/admin/drivers/{driver_id}/status` | `admin` | Update driver status (`FREE`, `ON_DELIVERY`, `OFF_DUTY`) |

---

## 🧪 Automated Testing & Diagnostics

Anti-Fesal includes an automated test suite covering non-functional requirements (NFRs), agentic resilience, auth/RBAC, and live tracking:

```bash
# Run all tests
python -m pytest tests/ -v

# Check configured cloud credentials and local fallbacks
python tests/check_credentials.py
```

### Test Suites Included:
1. **`test_role_separation_and_delivery.py`**:
   - Auth/RBAC (`401`/`403` enforcement, salted PBKDF2 login/register, forced `buyer` role, `/api/auth/gate` PIN validation).
   - End-to-end seller and driver KYC onboarding lifecycle, GPS consent validation, and role elevation.
   - Double-settlement `409` guard, driver live GPS streaming, 5-stage dispatch advancement, and live ETA calculation.
   - `/api/chatbot/compare`, `VisualInspectorAgent` transient error/local `/images/` loading, path-traversal protection, and Admin analytics.
2. **`test_nfr_accuracy.py`**:
   - Evaluates 50 benchmark listings (25 Egyptian Arabic dialect + 25 English).
   - Validates multi-agent appraisal accuracy $\ge 85\%$ and automated approval rate $\ge 70\%$.
3. **`test_nfr_reliability.py`**:
   - 100-item sequential ingestion stress test with 5 corrupted rows intercepted and logged cleanly without crashes ($\ge 95\%$ reliability).
4. **`test_fault_tolerance.py`**:
   - Exponential backoff retry behavior (`0s -> 3s -> 6s`) and `DISPATCH_FAILED` audit logging during downstream carrier disruptions.

---

## 🚢 Deployment

### Unified Full-Stack Deployment on Vercel (Recommended)
- Deploy directly from the **repository root (`.`)** — do **not** set Vercel's Root Directory to `frontend/`.
- `vercel.json` at the repo root wires both layers in one deployment:
  - `/api/(.*)` and `/images/(.*)` -> `/api/index.py` (FastAPI serverless function)
  - `/docs`, `/openapi.json`, and `/redoc` -> `/api/index.py` (production Swagger UI & OpenAPI spec)
  - `/` and `/(.*)` -> `/frontend/index.html` and `/frontend/$1` (static showroom, CSS, JS, `manifest.json`, `sw.js`, icons)
- Set production secrets (`AUTH_ENFORCE=1`, `SESSION_SECRET`, `ADMIN_ACCESS_PIN`, `CAPTAIN_ACCESS_PIN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `MONGODB_URI`, `APPWRITE_*`, `CLERK_*`, `DD_*`, `CUSTOM_DOMAIN`) in Vercel Project Environment Variables without committing `.env`.
- Note: Vercel's local filesystem is ephemeral (`/tmp`), so configure **MongoDB Atlas (`MONGODB_URI`)** and **Appwrite Cloud Storage (`APPWRITE_*`)** for persistent production storage.

### Standalone Backend on Render
- `render.yaml` is pre-configured for a Python Web Service running `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.

---

## 📜 Capstone & Academic Attribution

Developed as a Grade 2 Artificial Intelligence & Automation Capstone Project at **WE Applied Technology School (Alexandria)**. Designed to solve real re-commerce market inefficiencies in Egyptian secondhand trade through autonomous multi-agent systems and verified workflows.

*Official Slogan:* **"سعّر، بيع، ومن غير وجع فصال"** (Price it, sell it, without the bargaining headache).
