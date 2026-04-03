# KenyaWatch AI 🇰🇪
### AI-Powered Anti-Corruption Intelligence Platform

Built by **Douglas Mwebi (Daggy)** · Daggy Techs · Kisii, Kenya  
📧 daggytechs@gmail.com · 📱 +254 796 820 013

---

## What It Does

KenyaWatch AI fights corruption in Kenya through three AI pillars:

1. **Procurement Scanner** — AI risk-scores every government contract, flagging inflated prices, single-source awards, and politically connected suppliers
2. **Ghost Project Detector** — Cross-references satellite imagery vs. funded projects to detect infrastructure that exists on paper but not on the ground
3. **Citizen Reporting** — Anonymous, encrypted corruption reports routed by AI to EACC, DPP, or PPRA

---

## Project Structure

```
kenyawatch/
├── backend/          ← Node.js + Express + PostgreSQL API
│   ├── db/
│   │   └── index.js      # DB connection + schema init + seed
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── ai.js          # Claude AI chat proxy
│   │   ├── contracts.js   # Procurement CRUD + AI scoring
│   │   ├── ghostProjects.js
│   │   └── reports.js     # Citizen reports
│   ├── server.js
│   ├── package.json
│   ├── railway.json
│   └── .env.example
│
└── frontend/         ← Vanilla HTML/CSS/JS served via Express
    ├── public/
    │   └── index.html    # Full SPA — calls backend API
    ├── server.js
    ├── package.json
    └── railway.json
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- Anthropic API key from https://console.anthropic.com

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/kenyawatch.git
cd kenyawatch
```

### 2. Set up backend
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kenyawatch
ANTHROPIC_API_KEY=sk-ant-your-key-here
FRONTEND_URL=http://localhost:3000
```

Create the database:
```bash
psql -U postgres -c "CREATE DATABASE kenyawatch;"
```

Start backend:
```bash
npm start
# → Running on http://localhost:5000
# → Tables auto-created, demo data seeded
```

### 3. Set up frontend
```bash
cd ../frontend
npm install
```

The frontend calls the backend. For local dev, it auto-detects `localhost:5000`.

Start frontend:
```bash
npm start
# → Running on http://localhost:3000
```

Open http://localhost:3000

---

## Deploy to Railway (Step by Step)

You will create **3 Railway services** in one project:
1. PostgreSQL database
2. Backend (Node.js API)
3. Frontend (static server)

---

### Step 1 — Create Railway Project

1. Go to https://railway.app and log in
2. Click **New Project**
3. Select **Empty project**
4. Name it `kenyawatch`

---

### Step 2 — Add PostgreSQL Database

1. In your project, click **+ New Service**
2. Select **Database → PostgreSQL**
3. Railway provisions it instantly
4. Click the PostgreSQL service → go to **Variables** tab
5. Copy the `DATABASE_URL` value (you'll use it in Step 3)

---

### Step 3 — Deploy Backend

#### Push backend to GitHub first:
```bash
cd backend

# Initialize git (if not already)
git init
git add .
git commit -m "Initial backend commit"

# Create repo on GitHub named: kenyawatch-backend
# Then:
git remote add origin https://github.com/YOUR_USERNAME/kenyawatch-backend.git
git branch -M main
git push -u origin main
```

#### Deploy on Railway:
1. In your Railway project, click **+ New Service**
2. Select **GitHub Repo**
3. Connect your GitHub account if not done
4. Select `kenyawatch-backend`
5. Railway detects Node.js automatically via nixpacks

#### Set environment variables on Railway backend:
Go to your backend service → **Variables** tab → Add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `DATABASE_URL` | *(paste from Step 2)* |
| `ANTHROPIC_API_KEY` | `sk-ant-your-key-here` |
| `FRONTEND_URL` | *(leave blank for now — add after frontend deploys)* |

6. Click **Deploy** → Railway builds and starts the backend
7. After deploy, click **Settings** → copy your backend URL (e.g. `https://kenyawatch-backend.up.railway.app`)

---

### Step 4 — Deploy Frontend

#### Update the frontend API URL:
Before pushing, open `frontend/public/index.html` and find this line near the bottom of the `<script>`:

```javascript
const API = (window.ENV && window.ENV.BACKEND_URL) ? window.ENV.BACKEND_URL : '';
```

Replace with your actual backend Railway URL:
```javascript
const API = 'https://kenyawatch-backend.up.railway.app';
```

#### Push frontend to GitHub:
```bash
cd frontend
git init
git add .
git commit -m "Initial frontend commit"

# Create repo on GitHub named: kenyawatch-frontend
git remote add origin https://github.com/YOUR_USERNAME/kenyawatch-frontend.git
git branch -M main
git push -u origin main
```

#### Deploy on Railway:
1. In your Railway project, click **+ New Service → GitHub Repo**
2. Select `kenyawatch-frontend`
3. Set environment variable: `PORT` = `3000`
4. Click Deploy

After deploy, go to **Settings → Networking → Generate Domain** to get your public URL.

---

### Step 5 — Final CORS fix

Once frontend is deployed:
1. Go to your **backend** Railway service → Variables
2. Add: `FRONTEND_URL` = `https://your-frontend.up.railway.app`
3. Railway auto-redeploys

---

### Step 6 — Verify everything works

Test these URLs:
- `https://your-backend.up.railway.app/health` → should return `{"status":"ok"}`
- `https://your-backend.up.railway.app/api/contracts` → should return contract data
- `https://your-frontend.up.railway.app` → full platform loads

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/stats` | Dashboard stats |
| GET | `/api/contracts` | All contracts |
| POST | `/api/contracts/scan` | Scan new contract |
| GET | `/api/reports` | All reports (no PII) |
| POST | `/api/reports` | Submit report |
| GET | `/api/ghost-projects` | Ghost project list |
| POST | `/api/ai/chat` | AI chat (Claude) |

---

## Environment Variables Summary

### Backend
| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` on Railway |
| `PORT` | Yes | `5000` |
| `DATABASE_URL` | Yes | Auto-provided by Railway PostgreSQL |
| `ANTHROPIC_API_KEY` | Yes | From console.anthropic.com |
| `FRONTEND_URL` | Yes | Your deployed frontend URL |

### Frontend
| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | `3000` |

---

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL (pg), Helmet, CORS, Rate Limiting
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Frontend**: Vanilla HTML/CSS/JS, Syne + Space Mono fonts
- **Deployment**: Railway (backend + frontend + DB in one project)
- **Security**: Helmet, rate limiting, no PII storage, anonymous reports

---

*KenyaWatch AI — Built for the 2026 Kenya AI Hackathon*
