# Ocrolus Integration PoC

A Proof of Concept demonstrating a document integration pipeline between a processing system (Product A) and MeridianLink (Product B) using the **Generic Framework**.

## What It Does

```
   RECEIVE              PROCESS              RETURN
┌───────────┐      ┌───────────────┐      ┌───────────┐
│ Fetch docs │ ──▶  │ Dummy process │ ──▶  │ Upload    │
│ from       │      │ (metadata     │      │ processed │
│ MeridianLink│     │  stamps)      │      │ docs back │
└───────────┘      └───────────────┘      └───────────┘
```

## Quick Start

```bash
npm install          # Install dependencies
cp .env.example .env # Configure environment
npm start            # Start server on http://localhost:4000
```

Open [http://localhost:4000](http://localhost:4000) to access the dashboard.

## Modes

| Mode | `USE_MOCK` | Description |
|------|-----------|-------------|
| Simulated | `true` | Demo with mock data — no live API needed |
| Live | `false` | Connects to real MeridianLink Generic Framework API |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/integration/run` | Run full pipeline |
| `GET` | `/api/integration/status` | Current job status |
| `GET` | `/api/integration/history` | Job history |
| `POST` | `/api/auth/test` | Test authentication |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design and data flow
- [PRD](docs/PRD.md) — Requirements and scope
- [Local Setup](docs/LOCAL_SETUP.md) — Step-by-step setup guide

## Tech Stack

Node.js · Express · Axios · fast-xml-parser · Vanilla HTML/CSS/JS
