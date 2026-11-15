# Anti-Fesal (آنتي فصال) — Integrations & Setup Guide
> Official Slogan: **"سعّر، بيع، ومن غير وجع فصال"** ("Price it, sell it, without bargaining headache")  
> Alexandria, Egypt • WE Applied Technology School — Grade 2 AI & Automation Capstone

---

## Pre-Flight Status & Dual-Mode Fallback Architecture
The Anti-Fesal platform was built from first principles with **Zero-Crash Graceful Fallbacks**. If any external cloud integration key is not yet pasted in your `.env`, the system automatically engages local offline fallbacks:

| Service | Missing Key | Automatic Local Fallback |
| :--- | :--- | :--- |
| **Google Gemini 1.5 Flash** | `GEMINI_API_KEY` | Deterministic heuristic AI appraisal engine based on the Alexandria Price Matrix |
| **MongoDB Atlas** | `MONGODB_URI` | Embedded thread-safe **SQLite database** (`data/antifesal.db`) matching 100% of the cloud schema |
| **Appwrite Storage** | `APPWRITE_API_KEY` | Local static storage (`data/images/`) served directly via FastAPI static mount `/images` |
| **Clerk Authentication** | `CLERK_SECRET_KEY` | Built-in **Dev Role Switcher** (`Seller` \| `Merchant` \| `Driver`) in top navigation bar |
| **Datadog US5** | `DD_API_KEY` | Thread-safe CSV APM/LLM audit logger (`logs/automation_log.csv`) |
| **Custom Domain** | `CUSTOM_DOMAIN` | Localhost execution (`http://127.0.0.1:8000`) ready for 1-click cloud deploy |

---

## Step-by-Step Claim & Connection Instructions

### 1. Google AI Studio (`GEMINI_API_KEY`)
- **Where to get**: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **Steps**:
  1. Sign in with your Google account.
  2. Click **Create API Key** and choose/create a Google Cloud Project.
  3. Copy the generated key.
  4. Paste into `.env`:
     ```env
     GEMINI_API_KEY=AIzaSy...
     ```

---

### 2. MongoDB Atlas (`MONGODB_URI`) — GitHub Student Developer Pack
- **Where to claim**: [GitHub Student Developer Pack](https://education.github.com/pack) -> MongoDB Atlas Offer ($50 in Atlas credits + free cluster certification).
- **Steps**:
  1. In MongoDB Atlas dashboard, create a **M0 Free Cluster** (Select AWS or GCP, Region: `eu-central-1` or `eu-west-1` for lowest latency to Egypt).
  2. Under **Database Access**, create a database user (e.g., `antifesal_admin`) with password.
  3. Under **Network Access**, click **Add IP Address** -> select **Allow Access from Anywhere** (`0.0.0.0/0`) or your deployment IP.
  4. Click **Connect** -> **Drivers (Python)** -> Copy the connection string.
  5. Paste into `.env`:
     ```env
     MONGODB_URI=mongodb+srv://antifesal_admin:<password>@cluster0.abcde.mongodb.net/antifesal?retryWrites=true&w=majority
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
     APPWRITE_PROJECT_ID=your_project_id
     APPWRITE_BUCKET_ID=your_bucket_id
     APPWRITE_API_KEY=your_api_key
     ```

---

### 4. Clerk Authentication (`CLERK_*`)
- **Where to claim**: [https://dashboard.clerk.com](https://dashboard.clerk.com) (Free tier up to 10,000 active users).
- **Steps**:
  1. Create application `Anti-Fesal`.
  2. Choose Email, Google, and Phone authentication (popular in Alexandria).
  3. In **API Keys**, copy **Publishable Key** and **Secret Key**.
  4. Under **JWT Templates** (or default Issuer URL), find your JWKS URL: `https://<your-subdomain>.clerk.accounts.dev/.well-known/jwks.json`.
  5. Paste into `.env`:
     ```env
     CLERK_PUBLISHABLE_KEY=pk_test_...
     CLERK_SECRET_KEY=sk_test_...
     CLERK_JWKS_URL=https://...clerk.accounts.dev/.well-known/jwks.json
     ```

---

### 5. Datadog Pro Student Account (`DD_*`)
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

### 6. Namecheap Free Domain (`.me`) & Vercel / Render Deployment
- **Where to claim**: [GitHub Student Developer Pack](https://education.github.com/pack) -> Namecheap (Free 1-year `.me` domain + free SSL).
- **Claim Domain**: e.g. `anti-fesal.me` or `antifesal.me`.
- **Deploy Frontend to Vercel**:
  1. Push code to GitHub repository.
  2. Import into Vercel. Set Root Directory to `frontend`.
  3. Under Project Settings -> **Domains**, add `anti-fesal.me` or `www.anti-fesal.me`.
  4. In Namecheap DNS Management:
     - Add CNAME record: Host `www` -> Value `cname.vercel-dns.com`
     - Add A record: Host `@` -> Value `76.76.21.21` (Vercel Anycast IP)
- **Deploy Backend to Render**:
  1. Connect GitHub repo to Render as a **Web Service**.
  2. Use `render.yaml` provided in this project root.
  3. Set Custom Domain: `api.anti-fesal.me`.
  4. In Namecheap DNS:
     - Add CNAME record: Host `api` -> Value `your-service-name.onrender.com`

---

## Connecting to Antigravity MCP Servers (Optional)
To empower Antigravity's agents to directly manage your Datadog or MongoDB databases:
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
