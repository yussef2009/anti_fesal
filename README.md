# Anti-Fesal (آنتي فصال)

> **سعّر، بيع، ومن غير وجع فصال**  
> Price it, sell it, without the bargaining headache.

Anti-Fesal is an AI-assisted secondhand re-commerce and merchant automation platform for Alexandria, Egypt. It helps sellers list products, estimates condition and resale value, routes uncertain listings to merchant review, and manages settlement, delivery, customer replies, and operational reporting.

## Features

- Multi-agent intake workflow:
  - Visual inspection and category/condition classification
  - Alexandria price-matrix valuation
  - Confidence-based auto-approval or human-in-the-loop review
- Seller, merchant, driver, and admin workflows
- Product image uploads
- Catalog generation and slow-stock handling
- Settlement and dispatch tracking with retry/backoff behavior
- Arabic and English marketplace interface
- Marketing copy generation and buyer auto-replies
- Health, metrics, price-matrix, tracking, and audit-log endpoints
- Local-first fallbacks for development and disconnected environments

## Architecture

```text
frontend/                 Browser UI
backend/main.py           FastAPI application and API routes
backend/agents/           Inspection, valuation, dispatch, and messaging agents
backend/workflows/        Intake, catalog, and settlement workflows
backend/db_adapter.py     MongoDB Atlas with SQLite fallback
backend/storage_adapter.py Appwrite Storage with local disk fallback
data/                     Price matrix, datasets, and runtime SQLite data
logs/                     Local automation, correction, and skipped-item logs
tests/                    Accuracy, reliability, and fault-tolerance tests
```

The application automatically falls back to local services when cloud credentials are not configured:

| Capability | Cloud integration | Local fallback |
| --- | --- | --- |
| AI appraisal | Google Gemini | Deterministic price-matrix engine |
| Database | MongoDB Atlas | SQLite |
| Image storage | Appwrite Storage | `data/images/` |
| Authentication | Clerk | Development role switcher |
| Observability | Datadog | CSV audit logging |

## Requirements

- Python 3.11+
- Node.js 18+ (only needed for the convenience scripts)
- Optional cloud accounts and credentials for Gemini, MongoDB Atlas, Appwrite, Clerk, and Datadog

## Quick start

```bash
git clone https://github.com/yussef2009/anti_fesal.git
cd anti_fesal

python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1

python -m pip install -r requirements.txt
cp .env.example .env
python run.py
```

Open:

- Web app: <http://127.0.0.1:8000>
- Interactive API docs: <http://127.0.0.1:8000/docs>
- Health check: <http://127.0.0.1:8000/api/health>

The Node.js runner provides equivalent commands:

```bash
npm install
npm run dev
```

## Configuration

Copy `.env.example` to `.env` and set only the integrations you plan to use. Blank cloud credentials intentionally enable the local fallbacks. Never commit `.env` or real API keys.

Important variables include:

```dotenv
GEMINI_API_KEY=
MONGODB_URI=
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=
APPWRITE_BUCKET_ID=
APPWRITE_API_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWKS_URL=
DD_API_KEY=
DD_SITE=us5.datadoghq.com
DD_LLMOBS_ENABLED=1
DD_LLMOBS_ML_APP=anti-fesal
```

## Useful API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Integration and runtime status |
| `GET` | `/api/items` | Search and filter listings |
| `POST` | `/api/upload` | Upload a product image |
| `POST` | `/api/intake` | Create and appraise a listing |
| `POST` | `/api/review/{item_id}` | Merchant review or correction |
| `POST` | `/api/settle` | Settle a sale and schedule dispatch |
| `POST` | `/api/autoreply` | Generate a buyer response |
| `POST` | `/api/marketing/generate` | Generate listing marketing content |
| `POST` | `/api/catalog/run` | Generate the catalog |
| `GET` | `/api/dispatches` | View delivery jobs |
| `GET` | `/api/metrics` | View operational metrics |
| `GET` | `/api/price-matrix` | View Alexandria pricing data |

The complete, interactive OpenAPI specification is available at `/docs` while the server is running.

## Testing

Run the full test suite with either command:

```bash
python -m pytest tests/ -v
# or
npm test
```

The tests cover appraisal accuracy and auto-approval, 100-item reliability processing, corrupted-row handling, and dispatch retry/fault tolerance.

## Deployment

- **Backend:** `render.yaml` defines a Render web service using Uvicorn.
- **Frontend:** `vercel.json` contains the Vercel rewrites for the frontend and API.
- Set production secrets through the hosting provider's environment-variable settings, not in the repository.

See [`SETUP_AND_CONNECTIONS.md`](SETUP_AND_CONNECTIONS.md) for provider-specific integration and DNS instructions.

