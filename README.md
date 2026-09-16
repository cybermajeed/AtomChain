<div align="center">

# ⬢ ATOMCHAIN

### Sustainverse · Local-first supply-chain security, on your machine.

<img src="assets/hero-scan.svg" alt="AtomChain radar scan" width="340" />

[![Status](https://img.shields.io/badge/status-alpha-fcd535?style=for-the-badge&labelColor=181a20)](https://github.com/anomalyco/opencode)
[![Version](https://img.shields.io/badge/version-1.0-0ecb81?style=for-the-badge&labelColor=181a20)](https://github.com/anomalyco/opencode)
[![Platform](https://img.shields.io/badge/platform-windows%20%7C%20web-929aa5?style=for-the-badge&labelColor=181a20)](#-desktop-app)

</div>

---

## 🧭 What is it?

**AtomChain** is an end-to-end **dependency & supply-chain security scanner** that runs 100% locally. It pulls a project (GitHub repo, local folder, or ZIP), maps its dependency graph, cross-references vulnerabilities with **OSV**, scores the blast radius with a **risk engine**, and then hands every finding to an **AI investigator** backed by live web research — all inside a Python + React desktop app.

> Everything is stored in a local SQLite store. Your scans, your data. No cloud, no telemetry.

---

## ✨ Capabilities at a glance

| Marker | Capability | Where |
|--------|-----------|-------|
| <img src="https://img.shields.io/badge/github-scan-0ecb81" alt=""/> | Clone & scan **public/private GitHub repos** (OAuth or PAT) | `backend/scanner/` |
| <img src="https://img.shields.io/badge/local-folder-fcd535" alt=""/> | Scan **local directories** or **ZIP uploads** (native folder picker in desktop) | `backend/scanner/zip_manager.py` |
| <img src="https://img.shields.io/badge/npm--parser-3b82f6" alt=""/> | Parse `package.json` / `package-lock.json` manifests | `backend/parsers/npm_parser.py` |
| <img src="https://img.shields.io/badge/python--parser-3b82f6" alt=""/> | Parse Python dependency manifests & requirements | `backend/parsers/python_parser.py` |
| <img src="https://img.shields.io/badge/osv-cve-f6465d" alt=""/> | Vulnerability lookup via **OSV.dev** database | `backend/intelligence/osv_client.py` |
| <img src="https://img.shields.io/badge/risk-engine-fcd535" alt=""/> | Severity scoring + dependency **graph / blast radius** | `backend/risk/` · `backend/dependency/` |
| <img src="https://img.shields.io/badge/ai-investigator-2dbdb6" alt=""/> | **Groq / Gemini** analyst + **Tavily**-backed web research on each finding | `intelligence/` |
| <img src="https://img.shields.io/badge/trust-ledger-0ecb81" alt=""/> | Reusable **Trust Ledger** of vetted dependencies | `backend/trust/ledger.py` |
| <img src="https://img.shields.io/badge/desktop-electron-929aa5" alt=""/> | **Electron** desktop shell bundling the Python backend | `frontend/electron/` |

---

## 🔄 How a scan flows

```mermaid
flowchart LR
    A[Repo / Folder / ZIP] --> B[Clone & fetch manifests]
    B --> C[Parse npm + Python deps]
    C --> D[Build dependency graph]
    C --> E[OSV vulnerability lookup]
    D & E --> F[Risk engine scoring]
    F --> G[SQLite store]
    G --> H[AI Investigator + Tavily research]
    H --> I[Dashboard / Finding detail / Trust Ledger]
```

---

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph Desktop["🖥️ Desktop Shell"]
        E[Electron 44]
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
    E --> V
    F --> API
    I --> AI
    T --> D
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
[![NetworkX](https://img.shields.io/badge/NetworkX-5395e5?style=flat-square&labelColor=181a20)](https://networkx.org)
[![Groq](https://img.shields.io/badge/Groq-f55036?style=flat-square&logo=groq&logoColor=fff&labelColor=181a20)](https://groq.com)
[![Gemini](https://img.shields.io/badge/Gemini-8e75b2?style=flat-square&logo=googlegemini&logoColor=fff&labelColor=181a20)](https://ai.google.dev)

---

## 📦 Getting started

### Prerequisites
- [Node.js](https://nodejs.org) **20+** · npm **10+**
- [Python](https://python.org) **3.13**
- `git` available on `PATH`

### 1 · Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate                 # Windows · use .venv/bin/activate on macOS/Linux
pip install fastapi uvicorn httpx python-dotenv pydantic sqlalchemy networkx requests groq google-genai
python main.py                         # → http://127.0.0.1:8000
```

> 🔑 Copy `backend/.env.example` → `.env` (or reuse existing `.env`) and add your keys — see [Environment](#-environment-variables).

### 2 · Frontend (Vite)

```bash
cd frontend
npm install
npm run dev                            # → http://localhost:5173
```

### 3 · 🖥️ Run as a desktop app (Electron)

```bash
cd frontend
npm run electron:dev                   # boots Vite + launches Electron, Python included
```

`npm run electron:build` produces an installer (`.exe` via NSIS) in `frontend/dist-electron/`.

---

## 🔑 Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_CLIENT_ID` · `GITHUB_CLIENT_SECRET` · `GITHUB_OAUTH_CALLBACK_URL` | ✅ | GitHub OAuth sign-in |
| `GROQ_API_KEY_1` / `GROQ_API_KEY_2` | ✅ | Groq-based AI analyst |
| `GEMINI_API_KEY_1` | optional | Gemini fallback for the investigator |
| `TAVILY_API_KEY` | ✅ | Real-time web research on findings |

---

## 📁 Repository structure

```text
sustainverse/
├── backend/              # FastAPI server, scanners, risk + trust engines
│   ├── scanner/          #   Git clone, GitHub API, ZIP ingestion
│   ├── parsers/          #   npm & Python manifest parsers
│   ├── risk/             #   Severity / blast-radius scoring
│   ├── dependency/       #   Dependency graph builder (NetworkX)
│   ├── trust/            #   Vetted dependency Trust Ledger
│   └── ai/               #   AI investigator (Gemini)
├── intelligence/         # Shared engine layer
│   ├── ai/               #   Groq analyst + prompts + schemas
│   ├── research/         #   Tavily client, query builder, source ranking
│   └── cache.py          #   TTL cache for research & lookups
├── frontend/             # React 19 + Vite + Tailwind
│   ├── electron/         #   Desktop shell (spawns the Python backend)
│   ├── src/pages/        #   Dashboard, Finding Detail, Investigator, Trust Ledger, Login
│   └── src/components/   #   Finding panel, AI scan summary, graph views
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

## 🗺️ Roadmap

- [x] GitHub / local / ZIP source ingestion
- [x] npm + Python manifest parsing
- [x] OSV vulnerability lookup
- [x] Risk scoring + dependency graph
- [x] Local-first SQLite persistence
- [x] Electron desktop packaging
- [ ] CI/CD pipeline for cross-platform builds
- [ ] Rust (or WASM) scanning engine for hot-path parsing
- [ ] SBOM export (SPDX / CycloneDX)
- [ ] Realtime CVE monitoring subscriptions

---

## ⚖️ License

Local open-source edition for the community. Runs entirely on your machine — see the bundled
[Terms of Service](TERMS_OF_SERVICE.md) and [Privacy Policy](PRIVACY_POLICY.md).

<div align="center">

**Built with** ❤️ **+ <img src="https://img.shields.io/badge/React-61dafb?style=flat&logo=react" alt="React"/> · <img src="https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi" alt="FastAPI"/> · <img src="https://img.shields.io/badge/Electron-47848f?style=flat&logo=electron" alt="Electron"/> · <img src="https://img.shields.io/badge/OSV-f6465d?style=flat" alt="OSV"/>**

</div>
