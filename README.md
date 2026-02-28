# Ocrolus — MeridianLink Generic Framework Integration

A Proof of Concept demonstrating how **Ocrolus** (Product A) integrates with **MeridianLink** (Product B) using MeridianLink's **Generic Framework** — a launch URL mechanism where MeridianLink triggers the vendor's UI in a pop-up window.

## How It Works

```
  MeridianLink User                MeridianLink LOS                 Ocrolus (Your App)
  ────────────────                 ────────────────                  ──────────────────
  1. Clicks "Ocrolus"      ───►   2. POSTs XML to your             3. Parses XML, creates session
     in a loan file                   Launch URL                    4. Responds with PopupURL XML

                                   5. Opens pop-up at     ───►     6. Pop-up auto-runs pipeline:
                                      your PopupURL                    Auth → Receive → Process → Return

                                                                    7. Shows "Done — Close Window"
  8. Sees processed docs   ◄───   MeridianLink receives            9. postMessage sent to parent
                                   completion notification
```

## Integration Method

This PoC uses MeridianLink's **Generic Framework (Hyperlink) integration** — designed for vendors without a dedicated framework. The approach uses a **launch URL mechanism** where:

1. MeridianLink triggers the vendor's UI in a **pop-up window**
2. The vendor app automatically **receives documents** from the loan
3. The vendor app **processes** the documents
4. The vendor app **returns** the processed documents back to MeridianLink

## Quick Start

```bash
npm install          # Install dependencies
cp .env.example .env # Configure environment
npm start            # Start server on http://localhost:4000
```

Open [http://localhost:4000](http://localhost:4000) to access the admin dashboard.

## Modes

| Mode | `USE_MOCK` | Description |
|------|-----------|-------------|
| Simulated | `true` | Demo with mock data — no live API needed |
| Live | `false` | Connects to real MeridianLink Generic Framework API |

## MeridianLink Setup

To enable Ocrolus inside MeridianLink:

1. Go to **Lender** → **System Configuration** → **Generic Framework Vendors**
2. Add vendor: **Name** = `Ocrolus`, **Launch URL** = `https://your-deployed-url/api/generic-framework/launch`
3. Save — "Ocrolus" now appears as a clickable link inside every loan

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/generic-framework/launch` | XML handshake endpoint (MeridianLink calls this) |
| `GET` | `/launch` | Pop-up window served to MeridianLink users |
| `GET` | `/api/integration/status` | Pipeline progress (polled by pop-up) |
| `POST` | `/api/integration/run` | Manual pipeline trigger (dashboard) |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design, XML protocol, and data flow
- [PRD](docs/PRD.md) — Requirements, scope, and deliverables
- [Local Setup](docs/LOCAL_SETUP.md) — Step-by-step setup guide

## Tech Stack

Node.js · Express · Axios · fast-xml-parser · Vanilla HTML/CSS/JS

## Phase 1 Status

✅ Complete — Working PoC with Generic Framework pop-up integration and mock data
