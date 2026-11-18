# Anti-Fesal (آنتي فصال)

> **"سعّر، بيع، ومن غير وجع فصال"**  
> *Price it, sell it, without the bargaining headache.*

Anti-Fesal is an AI-assisted re-commerce and merchant automation platform engineered for the secondhand marketplace in Alexandria, Egypt. It provides fair, deterministic, and computer-vision-backed valuations, eliminates haggling with fixed price protection, routes uncertain listings to human-in-the-loop merchant review, and orchestrates live GPS delivery dispatch, cash settlements, and administrative governance.

---

## 🌟 Key Features & Ecosystem Roles

The platform enforces a **strictly role-separated architecture** tailored for the Alexandrian re-commerce market:

### 1. 🛒 Buyer-Centric Marketplace (Public Home Page)
- **100% Focused on the Buyer:** Zero clutter from internal triage queues or merchant backoffices on the public home page.
- **Showroom Feed:** Browse computer-vision-inspected and graded appliances, electronics, and furniture across Alexandria districts (El-Attarine, El-Mansheya, Sidi Beshr, Smouha, Miami, Loran, Gleem, Roushdy).
- **Fixed-Price Protection:** Settle and buy immediately with zero bargaining.
- **Fair Price Matrix Index:** Interactive Alexandria fair-price reference table.

### 2. 🏷️ Verified Sellers (بائع معتمد)
- **KYC Verification Gate:** Formal application modal collecting Alexandria shop/workshop name, business type (individual, workshop, showroom), National ID / Commercial Register, and cash payout wallet.
- **Automated / HITL Onboarding:** Requests are submitted to the central Admin Verification Desk (`PENDING_APPROVAL`).
- **Unlocked AI Valuation Studio:** Once approved by Admin, the seller studio unlocks to inspect items using Google Gemini Vision, calculate Grade A–D condition scores, and set fixed resale prices.
- **Subscription Tiers:** Everyday Seller (8% commission), Pro Trader (5% commission), and Enterprise Showroom (3% commission).

### 3. 🚚 Alexandria Delivery Captains (كباتن التوصيل)
- **Onboarding with Mandatory GPS Consent:** Collects vehicle type (pickup, van, tricycle, motorcycle), license plate, driver license number, and **explicit browser/device GPS sharing consent**.
- **Live Geolocation Streaming:** Driver portal streams real-time GPS coordinates via HTML5 `navigator.geolocation.watchPosition` to `/api/driver/location`.
- **Active Task Dispatcher:** Manage pickups, advance delivery stages, inspect items with buyers, and handle door-to-door cash payouts.

### 4. 🛣️ Realtime 5-Stage Stepper Road & Interactive Live Map
- **5-Stage Delivery Progression:**
  1. `ORDER_PLACED`: Deal booked and fixed price/commission locked.
  2. `DRIVER_ASSIGNED`: Captain assigned and route scheduled.
  3. `PICKED_UP`: Captain collects item from seller and hands over instant cash payout.
  4. `OUT_FOR_DELIVERY`: Captain in transit to the buyer with the item for hands-on inspection.
  5. `DELIVERED_SETTLED`: Buyer inspects item, cash collected, and deal settled.
- **Instant Buyer Notification:** When stage updates to `PICKED_UP`, an automated alert banner notifies the buyer immediately.
- **Interactive Leaflet Live Map:** Embedded OpenStreetMap tracking showing:
  - 🏪 Seller pickup point
  - 🚚 Moving captain pin with dynamic radar pulse
  - 🏠 Buyer delivery address
  - Animated route polyline and dynamic distance-based Alexandria ETA.

### 5. 🔐 Dedicated Admin Governance Portal (بوابة الإدارة المركزية)
- **Secured Gateway:** Access via `#admin` or discrete header shortcut with PIN protection (`ADMIN-2026`).
- **4 Core Business Performance Metrics:**
  1. **Total Orders Sold (إجمالي الصفقات المنفذة):** Count of successfully settled transactions.
  2. **Top Selling Categories Breakdown (أكثر الأقسام مبيعاً):** Percentage breakdown of Appliances, Electronics, and Furniture.
  3. **Top Buying Alexandria Districts (أكثر أحياء الإسكندرية شراءً):** Leaderboard ranking (Sidi Beshr, Smouha, El-Attarine, Miami, El-Mansheya).
  4. **Anti-Fesal Financials:** Gross Merchandise Value (GMV), Net Platform Brokerage Commission, and Driver Cash Payouts.
- **Application Verification Desk:** Queue of pending seller and driver onboarding requests with 1-click **Approve (اعتماد وقبول)** or **Reject (رفض)** actions.

---

## 🏛️ Architecture & Tech Stack

```text
frontend/
├── index.html            Clean, buyer-centric marketplace, Leaflet live map, onboarding modals, admin desk
├── app.js                Portal state routing, Leaflet map rendering, GPS streaming, application workflows
├── styles.css            Design system (Crimson #E00000, Emerald #0F766E), 5-step delivery road, dark mode
└── manifest.json         Progressive Web App manifest

backend/
├── main.py               FastAPI application, auth, live tracking, driver GPS, applications & analytics
├── db_adapter.py         Dual-mode MongoDB Atlas client with transparent SQLite fallback
├── storage_adapter.py    Appwrite Storage with local disk fallback (data/images/)
├── agents/               Specialized agentic workers
│   ├── visual_inspector.py   Gemini Vision multimodal inspector with heuristic fallback
│   ├── valuation_engine.py   Alexandria district & condition price matrix
│   ├── dispatch_router.py    Route scheduling and retry/backoff dispatching
│   └── negotiation_guard.py  Bargaining prevention and anti-fesal policy guard
└── workflows/
    ├── workflow_1_intake.py      Intake, inspection, grading, and routing
    ├── workflow_2_catalog.py     Catalog generation and slow-stock handling
    └── workflow_3_settlement.py  Reservation, dispatch assignment, and cash settlement

data/
├── init_db.py            SQLite schema (items, deals, dispatches, applications, driver_locations, users)
├── price_matrix.json     Alexandria benchmark valuation matrix
└── daily_catalog.md      Automated generated catalog

tests/
├── test_fault_tolerance.py               Circuit-breaker, retry & fallback resilience
├── test_nfr_accuracy.py                  Inspection & auto-approval threshold benchmarks
├── test_nfr_reliability.py               100-item batch intake reliability & corrupted input tolerance
└── test_role_separation_and_delivery.py  Onboarding lifecycle, GPS streaming, live map & admin analytics
```

### Dual-Mode Cloud & Local Fallbacks

Anti-Fesal runs out of the box with zero external configuration by engaging transparent local fallbacks:

| Capability | Cloud Integration | Local Fallback |
| :--- | :--- | :--- |
| **AI Appraisal** | Google Gemini Vision (`gemini-2.5-flash`) | Heuristic Alexandria rule-based engine |
| **Database** | MongoDB Atlas Cluster | Embedded SQLite (`data/antifesal.db`) |
| **Media Storage** | Appwrite Cloud Storage | Local filesystem (`data/images/`) |
| **Live Map** | Leaflet.js + OpenStreetMap | Static district centroid coordinates |
| **Observability** | Datadog Tracing & LLM Obs | Local CSV audit logging (`logs/`) |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (optional, for convenience scripts)

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

# 4. Configure environment (optional, defaults to local SQLite fallback)
cp .env.example .env

# 5. Initialize database tables
python data/init_db.py

# 6. Run the platform
python run.py
```

Open in your browser:
- **Buyer Marketplace & Showroom:** <http://127.0.0.1:8000>
- **Captain Delivery Gate:** <http://127.0.0.1:8000/#delivery> (PIN: `CAPTAIN-ALEX`)
- **Admin Governance Portal:** <http://127.0.0.1:8000/#admin> (PIN: `ADMIN-2026`)
- **Interactive Swagger API Docs:** <http://127.0.0.1:8000/docs>
- **Health Check Endpoint:** <http://127.0.0.1:8000/api/health>

---

## 📡 API Reference

### Onboarding & Application Gate
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/applications/apply` | Submit verified seller or driver onboarding application |
| `GET` | `/api/applications/my-status` | Check applicant's current review status (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`) |
| `GET` | `/api/admin/applications` | List pending/reviewed applications with role & status filters |
| `POST` | `/api/admin/applications/{app_id}/review` | Admin endpoint to Approve or Reject with notes and automated role upgrade |

### Real-Time Delivery & GPS Tracking
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/driver/location` | Driver streams live device GPS coordinates |
| `GET` | `/api/dispatches/{id}/live-tracking` | Fetch 5-step delivery road stage, coordinates, and live Alexandria ETA |
| `POST` | `/api/dispatches/{id}/step` | Advance dispatch road stage (`ORDER_PLACED` -> `PICKED_UP` -> `OUT_FOR_DELIVERY` -> `DELIVERED_SETTLED`) |
| `GET` | `/api/track/{query}` | Public order tracking by deal code, item ID, or phone |

### Admin Governance & Financials
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/analytics` | Fetch orders sold, top categories breakdown, top buying districts, and GMV/commission financials |
| `GET` | `/api/admin/financials` | Detailed daily volume and time-series financial data |
| `GET` | `/api/admin/users` | Platform user directory with instant blocking/unblocking controls |

### Intake, Appraisal & Marketplace
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/items` | Query verified listings with district and category filters |
| `POST` | `/api/upload` | Upload product image (Appwrite or local storage) |
| `POST` | `/api/intake` | Multi-agent inspection and valuation pipeline |
| `POST` | `/api/settle` | Reserve item, calculate platform fee, and trigger delivery dispatch |
| `GET` | `/api/price-matrix` | Fetch Alexandria benchmark price matrix |

---

## 🧪 Automated Testing

Anti-Fesal includes a test suite covering non-functional requirements (NFRs), agentic resilience, and role separation:

```bash
# Run all tests
python -m pytest tests/ -v
```

### Test Suites Included:
1. **`test_role_separation_and_delivery.py`**:
   - End-to-end seller and driver onboarding application lifecycle.
   - Admin approval verification and role upgrade.
   - Driver live GPS location streaming and coordinate updates.
   - 5-stage dispatch advancement and live ETA calculation.
   - Platform analytics verification (GMV, net commission, top categories & districts).
2. **`test_nfr_accuracy.py`**:
   - Evaluates 50 benchmark listings (25 Egyptian Arabic dialect + 25 English).
   - Validates multi-agent appraisal accuracy $\ge 85\%$ and automated approval rate $\ge 70\%$.
3. **`test_nfr_reliability.py`**:
   - 100-item sequential ingestion stress test with corrupted row handling and automated error logging.
4. **`test_fault_tolerance.py`**:
   - Circuit breaker and exponential backoff retry behavior during downstream service disruptions.

---

## 🚢 Deployment

- **Backend:** `render.yaml` pre-configured for Render Web Service deployment using Uvicorn.
- **Frontend:** `vercel.json` pre-configured for Vercel deployment with static hosting and backend proxy rewrites.
- Set production environment secrets securely in the hosting provider's dashboard without committing `.env`.

---

## 📜 Capstone & Academic Attribution

Developed as a Grade 2 Artificial Intelligence & Automation Capstone Project at **WE Applied Technology School (Alexandria)**. Designed to solve real re-commerce market inefficiencies in Egyptian secondhand trade through autonomous multi-agent systems and verified workflows.

*Official Slogan:* **"سعّر، بيع، ومن غير وجع فصال"** (Price it, sell it, without the bargaining headache).

