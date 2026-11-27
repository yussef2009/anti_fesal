# Anti-Fesal (آنتي فصال) — Integrations & Setup Guide
> Official Slogan: **"سعّر، بيع، ومن غير وجع فصال"** ("Price it, sell it, without bargaining headache")  
> Alexandria, Egypt • WE Applied Technology School — Grade 2 AI & Automation Capstone

---

## Pre-Flight Status & Dual-Mode Fallback Architecture
The Anti-Fesal platform was built from first principles with **Zero-Crash Graceful Fallbacks**. If any external cloud integration key is not yet configured in your `.env`, the system automatically engages local offline fallbacks:

| Service | Configuration Key(s) | Automatic Local Fallback |
| :--- | :--- | :--- |
| **Google Gemini 1.5 Flash** | `GEMINI_API_KEY`, `GEMINI_MODEL` | Deterministic heuristic AI appraisal engine based on `data/price_matrix_alexandria.csv` |
| **MongoDB Atlas** | `MONGODB_URI` | Embedded thread-safe **SQLite database** (`data/antifesal.db` locally; `/tmp/data/antifesal.db` on Vercel) |
| **Appwrite Storage** | `APPWRITE_API_KEY` | Local static storage (`data/images/` locally; `/tmp/data/images/` on Vercel) served via `/images` |
| **Clerk Authentication** | `CLERK_SECRET_KEY`, `CLERK_JWKS_URL` | Built-in **HMAC-SHA256 Session Auth** (`SESSION_SECRET`) + PBKDF2 login/register + `/api/auth/gate` PIN verification (`AUTH_ENFORCE=1` default) |
| **Datadog US5** | `DD_API_KEY` | Thread-safe CSV APM/LLM audit logger (`logs/automation_log.csv`, `logs/skipped_items_log.csv`, `logs/corrections.csv`) |
| **Custom Domain** | `CUSTOM_DOMAIN` | Localhost execution (`http://127.0.0.1:8000`) ready for unified Vercel or Render deployment |

To inspect live connectivity across all configured services at any time, run:
```bash
python tests/check_credentials.py
```
You can also check runtime status and active fallback modes at `GET /api/health`.

---

## Step-by-Step Claim & Connection Instructions

### 1. Google AI Studio (`GEMINI_API_KEY` & `GEMINI_MODEL`)
- **Where to get**: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **Steps**:
  1. Sign in with your Google account.
  2. Click **Create API Key** and choose/create a Google Cloud Project.
  3. Copy the generated key.
  4. Paste into `.env` (keep `GEMINI_MODEL=gemini-1.5-flash` unless intentionally targeting another supported Gemini model):
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     GEMINI_MODEL=gemini-1.5-flash
     ```

---

### 2. MongoDB Atlas (`MONGODB_URI`) — GitHub Student Developer Pack
- **Where to claim**: [GitHub Student Developer Pack](https://education.github.com/pack) -> MongoDB Atlas Offer ($50 in Atlas credits + free cluster certification).
- **Steps**:
  1. In MongoDB Atlas dashboard, create an **M0 Free Cluster** (Select AWS or GCP, Region: `eu-central-1` or `eu-west-1` for lowest latency to Egypt).
  2. Under **Database Access**, create a database user (e.g., `antifesal_admin`) with a strong password.
  3. Under **Network Access**, click **Add IP Address** -> select **Allow Access from Anywhere** (`0.0.0.0/0`) or your deployment IP range.
  4. Click **Connect** -> **Drivers (Python)** -> Copy the connection string.
  5. Paste into `.env`:
     ```env
     MONGODB_URI=mongodb+srv://<username>:<db_password>@<cluster-host>.mongodb.net/antifesal?retryWrites=true&w=majority
     ```

---

### 3. Appwrite Education Storage (`APPWRITE_*`) — GitHub Student Developer Pack
- **Where to claim**: [https://cloud.appwrite.io](https://cloud.appwrite.io) (Appwrite Cloud Education benefit from GitHub Student Pack).
- **Steps**:
  1. Sign up / Log in to Appwrite Cloud.
  2. Create a new Project named `Anti-Fesal`. Note down `Project ID`.
  3. In the left menu, click **Storage** -> **Create Bucket** named `product-photos`. Note down `Bucket ID`.
  4. Go to **Project Settings** -> **View API Keys** -> **Create API Key**.
  5. Give permissions: `files.read`, `files.write`, `files.delete`.
  6. Paste into `.env`:
     ```env
     APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
     APPWRITE_PROJECT_ID=your_appwrite_project_id
     APPWRITE_BUCKET_ID=your_appwrite_bucket_id
     APPWRITE_API_KEY=your_appwrite_api_key
     ```

---

### 4. Clerk Authentication (`CLERK_*`) & Built-In HMAC Fallback
- **Where to claim**: [https://dashboard.clerk.com](https://dashboard.clerk.com) (Free tier up to 10,000 active users).
- **How Auth Works**:
  - When `CLERK_SECRET_KEY` and `CLERK_JWKS_URL` are configured, the backend validates 3-part Clerk RS256 JWTs against your JWKS endpoint and reads `public_metadata.role`.
  - When Clerk is omitted, Anti-Fesal uses its built-in **HMAC-SHA256 Session Auth** (`POST /api/auth/login`, `POST /api/auth/register`, and `POST /api/auth/gate`) with salted PBKDF2 password hashing and strict RBAC.
- **Steps (Optional Clerk Cloud Upgrade)**:
  1. Create application `Anti-Fesal` in Clerk Dashboard.
  2. Enable Email, Google, and Phone authentication.
  3. In **API Keys**, copy **Publishable Key** and **Secret Key**.
  4. Under **JWT Templates** / Issuer URL, copy your JWKS URL (`https://<your-subdomain>.clerk.accounts.dev/.well-known/jwks.json`).
  5. Paste into `.env`:
     ```env
     CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
     CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
     CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
     ```

---

### 5. Security, RBAC & Portal Gates (`AUTH_ENFORCE`, `SESSION_SECRET`, `ADMIN_ACCESS_PIN`, `CAPTAIN_ACCESS_PIN`)
Anti-Fesal enforces server-side authentication and role-based access control on all sensitive endpoints (`/api/admin/*`, `/api/review/*`, `/api/driver/*`, `/api/dispatches/*/step`, `/api/dispatches/*/status`, `/api/catalog/run`, `/api/logs/*`, `/api/intake`, `/api/user/account-data`):

- **`AUTH_ENFORCE`** (default: `1`):
  - `1`: Requires a valid `Authorization: Bearer <token>` (HMAC session token or Clerk JWT) on protected endpoints. Anonymous requests always default to `role: "buyer"` and `X-Dev-Role` headers are ignored.
  - `0`: Only for isolated local debugging — permits `X-Dev-Role` header overrides and legacy passwordless seed records. **Never set `AUTH_ENFORCE=0` in production.**
- **`SESSION_SECRET`**:
  - Cryptographically random secret (32+ characters recommended) used to sign and verify HMAC-SHA256 Bearer session tokens. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(32))"` and set it in `.env` and your cloud dashboard.
- **`ADMIN_ACCESS_PIN`** & **`CAPTAIN_ACCESS_PIN`**:
  - Server-side portal PINs verified in constant time (`hmac.compare_digest`) via `POST /api/auth/gate` to issue signed `admin` or `driver` session tokens. Never embed production PINs in frontend files or commit `.env` to Git.

```env
AUTH_ENFORCE=1
SESSION_SECRET=replace_with_strong_random_32_char_secret
ADMIN_ACCESS_PIN=replace_with_strong_admin_pin
CAPTAIN_ACCESS_PIN=replace_with_strong_captain_pin
```

---

### 6. Datadog Pro Student Account (`DD_*`)
- **Where to claim**: [GitHub Student Developer Pack](https://education.github.com/pack) -> Datadog offer (free 1-year Pro account).
- **Steps**:
  1. Register your student account at [https://us5.datadoghq.com](https://us5.datadoghq.com).
  2. Navigate to **Organization Settings** -> **API Keys**.
  3. Generate a new API Key named `anti-fesal-capstone`.
  4. Under **LLM Observability**, enable the service for `anti-fesal`.
  5. Paste into `.env`:
     ```env
     DD_API_KEY=your_datadog_api_key
     DD_SITE=us5.datadoghq.com
     DD_LLMOBS_ENABLED=1
     DD_LLMOBS_ML_APP=anti-fesal
     DD_SERVICE=anti-fesal-backend
     DD_ENV=production
     ```

---

### 7. Namecheap Free Domain (`.me`) & Vercel / Render Deployment
- **Where to claim**: [GitHub Student Developer Pack](https://education.github.com/pack) -> Namecheap (Free 1-year `.me` domain + free SSL).
- **Claim Domain**: e.g. `anti-fesal.me` (configured via `CUSTOM_DOMAIN` for CORS origin allowance and marketing links).
- **Deploy Full-Stack App to Vercel (Unified Frontend + FastAPI Serverless):**
  1. Push your code to your GitHub repository.
  2. Import the repository into Vercel and **keep Root Directory set to `.` (repository root)** — do **not** change Root Directory to `frontend`!
     - Keeping the repository root allows Vercel's Python/FastAPI runtime (`pyproject.toml` -> `api.index:app`) to serve the frontend (`frontend/*`) as well as `/api/*`, `/images/*`, `/docs`, `/openapi.json`, and `/redoc` through the unified FastAPI app without path-breaking rewrites.
  3. Under Project Settings -> **Environment Variables**, add your production values (`AUTH_ENFORCE=1`, `SESSION_SECRET`, `ADMIN_ACCESS_PIN`, `CAPTAIN_ACCESS_PIN`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-1.5-flash`, `MONGODB_URI`, `APPWRITE_*`, `CLERK_*`, `DD_*`, `CUSTOM_DOMAIN`).
     - *Persistence Note:* On Vercel serverless functions, the local filesystem is ephemeral (`/tmp`), so configure **MongoDB Atlas (`MONGODB_URI`)** and **Appwrite Storage (`APPWRITE_*`)** for persistent production database records and uploaded images.
  4. Under Project Settings -> **Domains**, add `anti-fesal.me` or `www.anti-fesal.me`.
  5. In Namecheap DNS Management:
     - Add CNAME record: Host `www` -> Value `cname.vercel-dns.com`
     - Add A record: Host `@` -> Value `76.76.21.21` (Vercel Anycast IP)
- **Deploy Standalone Backend to Render (Optional):**
  1. Connect the GitHub repo to Render as a **Web Service**.
  2. Use `render.yaml` provided in the project root (`uvicorn backend.main:app --host 0.0.0.0 --port $PORT`).
  3. Set the same production environment secrets (`AUTH_ENFORCE`, `SESSION_SECRET`, `ADMIN_ACCESS_PIN`, `CAPTAIN_ACCESS_PIN`, and external service keys) in the Render dashboard.
  4. Set Custom Domain (e.g., `api.anti-fesal.me`) and add a CNAME record (`api` -> `your-service-name.onrender.com`) in Namecheap DNS.

---

## Connecting to Antigravity MCP Servers (Optional)
To empower Antigravity's agents to directly manage your MongoDB Atlas database:
Open `~/.gemini/config/mcp_config.json` and add:
```json
{
  "mcpServers": {
    "mongodb-atlas": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-mongodb-atlas"],
      "env": {
        "MONGODB_URI": "your_mongodb_uri"
      }
    }
  }
}
```
