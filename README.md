<div align="center">

# ⬢ ATOMCHAIN

### AtomChain · Local-first supply-chain security, on your machine.

<img src="assets/hero-scan.svg" alt="AtomChain radar scan" width="340" />

<div align="center">

[![Status](https://img.shields.io/badge/status-alpha-fcd535?style=for-the-badge&labelColor=181a20)](#)
[![Version](https://img.shields.io/badge/version-1.0-0ecb81?style=for-the-badge&labelColor=181a20)](#)
[![Platform](https://img.shields.io/badge/platform-windows%20%7C%20web%20%7C%20docker-929aa5?style=for-the-badge&labelColor=181a20)](#-getting-started)

</div>

---

## 🧭 What is it?

**AtomChain** is an AI-powered platform that scans GitHub or local repositories to detect vulnerable or suspicious dependencies, assess risk, and provide evidence-based remediation recommendations for human review. 

A **blockchain-inspired Trust Ledger** securely records scan results and security decisions to ensure integrity and traceability. The platform supports **npm and Python** ecosystems out-of-the-box, providing a seamless pipeline from dependency parsing to AI-assisted security triaging.

---

## ✨ Capabilities at a glance

| Marker | Capability | Where |
|--------|-----------|-------|
| <img src="https://img.shields.io/badge/github-scan-0ecb81" alt=""/> | Clone & scan **public/private GitHub repos** (OAuth or PAT) | `backend/scanner/` |
| <img src="https://img.shields.io/badge/local-folder-fcd535" alt=""/> | Scan **local directories** or **ZIP uploads** | `backend/scanner/zip_manager.py` |
| <img src="https://img.shields.io/badge/npm--parser-3b82f6" alt=""/> | Parse `package.json` / `package-lock.json` manifests | `backend/parsers/npm_parser.py` |
| <img src="https://img.shields.io/badge/python--parser-3b82f6" alt=""/> | Parse Python dependency manifests & requirements | `backend/parsers/python_parser.py` |
| <img src="https://img.shields.io/badge/osv-cve-f6465d" alt=""/> | External vulnerability intelligence via **OSV.dev** | `backend/intelligence/osv_client.py` |
| <img src="https://img.shields.io/badge/risk-engine-fcd535" alt=""/> | Contextual priority scoring + dependency **graph / blast radius** | `backend/risk/` · `backend/dependency/` |
| <img src="https://img.shields.io/badge/ai-investigator-2dbdb6" alt=""/> | **Groq / Gemini** analyst + **Tavily** web research for explainable assessment | `intelligence/` |
| <img src="https://img.shields.io/badge/trust-ledger-0ecb81" alt=""/> | Tamper-evident **Trust Ledger** for history of SBOMs and remediation | `backend/trust/ledger.py` |
| <img src="https://img.shields.io/badge/desktop-electron-929aa5" alt=""/> | **Electron / Docker** application bundling | `frontend/` · `docker-compose.yml` |

---

## 🔄 Architecture & Workflow

```mermaid
flowchart LR
    A[Repo / ZIP / GitHub] -->|1. SCAN| B[Clone & Fetch Manifests]
    B -->|2. ANALYZE| C[Parse npm + Python Deps]
    C -->|3. CORRELATE| D[Dependency Graph]
    C --> E[OSV Intelligence]
    D & E -->|4. ASSESS| F[Risk Engine Scoring]
    F --> G[SQLite Store]
    G -->|5. EXPLAIN| H[AI Evidence Layer]
    H --> I[Human Review Dashboard]
    I -->|6. VERIFY| J[Trust Ledger]
```

---

## 🏗️ Technical Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Client Interface"]
        E[Electron / Browser]
    end
    subgraph Frontend["⚛️ Frontend · React 19 + Vite 8"]
        V[Dashboard] --> F[Finding Detail]
        V --> I[AI Investigator]
        V --> T[Trust Ledger]
    end
    subgraph Backend["🐍 Backend · FastAPI :8000"]
        API[main.py API] --> S[Scanner]
        S --> P[npm + Python parsers]
        S --> O[OSV client]
        API --> R[Risk Engine]
        API --> D[SQLAlchemy · SQLite]
        API --> AI[Groq / Gemini analyst]
        AI --> W[Tavily research + cache]
    end
    subgraph Deployment["🐳 Infrastructure"]
        DK[Docker Compose]
    end
    E --> V
    F --> API
    I --> AI
    T --> D
    DK -.-> Frontend
    DK -.-> Backend
```

---

## 🛠️ Tech stack

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=fff&labelColor=181a20)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=fff&labelColor=181a20)](https://vitejs.dev)
[![Electron](https://img.shields.io/badge/Electron-44-47848f?style=flat-square&logo=electron&logoColor=fff&labelColor=181a20)](https://www.electronjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss&logoColor=fff&labelColor=181a20)](https://tailwindcss.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=fff&labelColor=181a20)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.13-3776ab?style=flat-square&logo=python&logoColor=fff&labelColor=181a20)](https://python.org)
[![SQLite](https://img.shields.io/badge/SQLite-003b57?style=flat-square&logo=sqlite&logoColor=fff&labelColor=181a20)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=fff&labelColor=181a20)](https://docker.com)
[![Groq](https://img.shields.io/badge/Groq-f55036?style=flat-square&logo=groq&logoColor=fff&labelColor=181a20)](https://groq.com)
[![Gemini](https://img.shields.io/badge/Gemini-8e75b2?style=flat-square&logo=googlegemini&logoColor=fff&labelColor=181a20)](https://ai.google.dev)

---

## 📦 Getting started

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose (Recommended)
- **OR** [Node.js](https://nodejs.org) **20+** & [Python](https://python.org) **3.11+**

### 🐳 1 · Recommended: Run with Docker Compose

The easiest way to run the entire stack (Backend + Frontend) is via Docker.

```bash
docker-compose up --build
```

- API Server: `http://localhost:8000`
- React Dashboard: `http://localhost:5173`

> 🔑 **Important:** Before running, copy `backend/.env.example` to `backend/.env` and add your API keys — see [Environment](#-environment-variables).

### 2 · Manual Setup: Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate                 # Windows · use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
python main.py                         # → http://127.0.0.1:8000
```

### 3 · Manual Setup: Frontend (Vite)

```bash
cd frontend
npm install
npm run dev                            # → http://localhost:5173
```

### 4 · 🖥️ Run as a desktop app (Electron)

```bash
cd frontend
npm run electron:dev                   # boots Vite + launches Electron, Python included
```

`npm run electron:build` produces an installer (`.exe` via NSIS) in `frontend/dist-electron/`.

---

## 🔑 Environment variables

Located in `backend/.env`:

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_CLIENT_ID` · `GITHUB_CLIENT_SECRET` · `GITHUB_OAUTH_CALLBACK_URL` | ✅ | GitHub OAuth sign-in |
| `GROQ_API_KEY_1` / `GROQ_API_KEY_2` | ✅ | Groq-based AI analyst |
| `GEMINI_API_KEY_1` | optional | Gemini fallback for the investigator |
| `TAVILY_API_KEY` | ✅ | Real-time web research on findings |

---

## 📁 Repository structure

```text
AtomChain/
├── backend/              # FastAPI server, scanners, risk + trust engines
│   ├── scanner/          #   Git clone, GitHub API, ZIP ingestion
│   ├── parsers/          #   npm & Python manifest parsers
│   ├── risk/             #   Severity / blast-radius scoring
│   ├── dependency/       #   Dependency graph builder (NetworkX)
│   ├── trust/            #   Vetted dependency Trust Ledger
│   └── ai/               #   AI investigator (Gemini/Groq)
├── intelligence/         # Shared engine layer
│   ├── ai/               #   Analyst prompts + schemas
│   ├── research/         #   Tavily client, query builder, source ranking
│   └── cache.py          #   TTL cache for research & lookups
├── frontend/             # React 19 + Vite + Tailwind
│   ├── electron/         #   Desktop shell
│   ├── src/pages/        #   Dashboard, Finding Detail, Investigator, Trust Ledger, Login
│   └── src/components/   #   Finding panel, AI scan summary, graph views
├── docker-compose.yml    # Container orchestration
└── assets/               # README media
```

---

## 📜 NPM scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (browser) |
| `npm run build` | Production frontend build |
| `npm run lint` | Static analysis via **Oxlint** |
| `npm run electron:dev` | **Desktop mode** — Vite + Electron + Python |
| `npm run electron:build` | Package installer via **electron-builder** (NSIS) |

---

## 🗺️ Roadmap & Future Scope

- [x] GitHub / local / ZIP source ingestion
- [x] npm + Python manifest parsing
- [x] OSV vulnerability lookup
- [x] Risk scoring + dependency graph
- [x] Local-first SQLite persistence
- [x] Electron desktop packaging
- [x] Docker deployment reproducibility
- [x] Tree-sitter / Code-level reachability analysis
- [ ] More ecosystems (Maven, Go, containers)
- [ ] CI/CD and PR-level continuous assessment
- [ ] Policy engine for organization-specific risk

---

## ⚖️ License

Local open-source edition for the community. Runs entirely on your machine — see the bundled
[Terms of Service](TERMS_OF_SERVICE.md) and [Privacy Policy](PRIVACY_POLICY.md).

<div align="center">

**Built with** ❤️ **+ <img src="https://img.shields.io/badge/React-61dafb?style=flat&logo=react" alt="React"/> · <img src="https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi" alt="FastAPI"/> · <img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker" alt="Docker"/> · <img src="https://img.shields.io/badge/OSV-f6465d?style=flat" alt="OSV"/>**

</div>
