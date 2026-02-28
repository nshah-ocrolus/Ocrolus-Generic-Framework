# Product Architecture Document

## Ocrolus — MeridianLink Generic Framework Integration

**Version:** 3.0  
**Integration Method:** Generic Framework (Launch URL / Pop-Up)  
**Phase:** 1 — Proof of Concept

---

## 1. Overview

This Proof of Concept demonstrates a document processing integration between two products in the mortgage industry:

- **Ocrolus (Product A)** — A document processing system that reviews, categorizes, and validates mortgage documents
- **MeridianLink (Product B)** — A mortgage industry platform (LOS) that stores and manages loan documents

### Integration Method

We use MeridianLink's **Generic Framework (Hyperlink) integration** — designed for vendors without a dedicated framework. This approach uses a **launch URL mechanism** where MeridianLink triggers the vendor's UI in a pop-up window.

When a MeridianLink user clicks "Ocrolus" inside a loan, a pop-up opens, automatically receives the loan's documents, processes them, and sends them back — all seamlessly.

### How It Works

```
  MeridianLink User                MeridianLink LOS                 Ocrolus (Your App)
  ────────────────                 ────────────────                  ──────────────────
  1. Clicks "Ocrolus"      ───►   2. POSTs XML to                  3. Parses XML request:
     in a loan file                  /api/generic-framework/launch      - LoanNumber
                                                                        - EncryptedTicket
                                                                        - UserLogin
                                                                    4. Creates session (30-min TTL)
                                                                    5. Responds with PopupURL XML

                                   6. Opens pop-up at     ───►     7. Pop-up auto-runs pipeline:
                                      the PopupURL                     Step 1: Authenticate
                                                                       Step 2: Receive documents
                                                                       Step 3: Process documents
                                                                       Step 4: Return to MeridianLink

                                                                    8. Shows "Done — Close Window"
  9. Sees processed docs   ◄───   MeridianLink receives            10. postMessage sent to parent
                                   completion notification
```

---

## 2. XML Handshake Protocol

### Step 1: MeridianLink Sends Request

When a user clicks the vendor link, MeridianLink POSTs this XML to your Launch URL:

```xml
<LQBGenericFrameworkRequest>
  <CredentialXML>
    <credentials username="lenderUser" password="lenderPass" accountID="42" />
  </CredentialXML>
  <LoanNumber>LN-2026-001</LoanNumber>
  <UserLogin>rseward</UserLogin>
  <LendingQBLoanCredential>
    <GENERIC_FRAMEWORK_USER_TICKET EncryptedTicket="Pb7NRhW2BAr5Pqz..." />
  </LendingQBLoanCredential>
</LQBGenericFrameworkRequest>
```

### Step 2: Your App Responds

Your app parses the XML, stores the EncryptedTicket in a session (30-minute TTL), and responds:

```xml
<LQBGenericFrameworkResponse>
  <Window url="https://your-server.com/launch?sessionId=UUID&amp;loanNumber=LN-2026-001"
          height="850" width="650" modalIndicator="Y" />
</LQBGenericFrameworkResponse>
```

### Step 3: Pop-Up Opens

MeridianLink opens the PopupURL in a modal window. The pop-up automatically runs the 4-step pipeline.

---

## 3. Pipeline Steps

Every integration run follows four steps:

| Step | What Happens | Phase 1 Status |
|------|-------------|----------------|
| **1. Authenticate** | Use EncryptedTicket from session (or OAuth fallback) | ✅ Mock mode |
| **2. Receive** | List and download documents for the loan | ✅ Mock mode (5 sample docs) |
| **3. Process** | Process each document (review, categorize, validate) | ✅ Placeholder |
| **4. Return** | Upload processed documents back to MeridianLink | ✅ Mock mode |

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Ocrolus Application                             │
│                                                                          │
│   ┌──────────────────┐    ┌───────────────┐    ┌──────────────────────┐ │
│   │  Admin Dashboard  │    │  Integration  │    │  Generic Framework   │ │
│   │  (port 4000)      │    │  Orchestrator │    │  XML Endpoint        │ │
│   │  - Manual trigger │    │  - 4-step     │    │  - Receives XML POST │ │
│   │  - Job history    │    │    pipeline   │    │  - Session store     │ │
│   │  - Status view    │    │  - Job mgmt  │    │  - Responds PopupURL │ │
│   └──────────────────┘    └───────┬───────┘    └──────────────────────┘ │
│                                   │                                      │
│                    ┌──────────────┼──────────────┐                       │
│                    ▼                             ▼                       │
│         ┌──────────────────┐          ┌──────────────────┐              │
│         │  MeridianLink    │          │  Document         │              │
│         │  API Client      │          │  Processor         │              │
│         │  (OAuth + Ticket)│          │  (Placeholder)     │              │
│         └────────┬─────────┘          └──────────────────┘              │
│                  │                                                       │
│   ┌──────────────────────────────────────────┐                          │
│   │  Pop-Up Window (launch.html)              │                          │
│   │  - Auto-starts pipeline                   │                          │
│   │  - Shows real-time step progress          │                          │
│   │  - "Done — Close Window" button           │                          │
│   │  - postMessage to MeridianLink parent     │                          │
│   └──────────────────────────────────────────┘                          │
│                  │                                                       │
└──────────────────┼───────────────────────────────────────────────────────┘
                   │
                   │ HTTPS
                   ▼
          ┌──────────────────┐
          │   MeridianLink   │
          │   Cloud (LOS)    │
          └──────────────────┘
```

---

## 5. Component Responsibilities

| Component | Role |
|-----------|------|
| **Generic Framework XML Endpoint** | Handles the XML handshake — receives MeridianLink POST, parses loan/ticket, creates session, returns PopupURL |
| **Pop-Up Window** | The UI that appears inside MeridianLink — shows pipeline progress and sends completion message |
| **Integration Orchestrator** | Coordinates the 4-step pipeline (Auth → Receive → Process → Return) |
| **MeridianLink API Client** | Handles OAuth and EncryptedTicket auth, SOAP calls to EDocsService |
| **Document Processor** | Placeholder in Phase 1 — will contain real Ocrolus processing logic in later phases |
| **Admin Dashboard** | Internal admin UI for manual testing and job history |

---

## 6. File Structure

```
Ocrolus-Generic-Framework/
├── src/
│   ├── app.js                          # Express server entry point
│   ├── orchestrator.js                 # Pipeline coordinator (4-step flow)
│   ├── config/
│   │   └── index.js                    # Environment config
│   ├── routes/
│   │   ├── api.js                      # Dashboard + manual API endpoints
│   │   └── generic-framework.js        # XML handshake + session endpoints
│   └── services/
│       ├── meridianlink-client.js      # MeridianLink API client (OAuth + Ticket)
│       ├── mock-client.js              # Simulated MeridianLink (demo mode)
│       └── document-processor.js       # Document processing (placeholder)
├── public/
│   ├── index.html                      # Admin dashboard
│   ├── app.js                          # Dashboard frontend logic
│   ├── styles.css                      # Dashboard styling
│   ├── launch.html                     # Pop-up window (opened by MeridianLink)
│   ├── launch-app.js                   # Pop-up frontend logic
│   └── launch-styles.css               # Pop-up styling
├── docs/
│   ├── ARCHITECTURE.md                 # This document
│   ├── PRD.md                          # Product requirements
│   └── LOCAL_SETUP.md                  # Setup guide
├── .env.example                        # Config template
├── package.json                        # Dependencies
└── README.md                           # Quick start
```

---

## 7. Authentication Methods

The app supports two authentication methods:

| Method | When Used | How It Works |
|--------|-----------|-------------|
| **EncryptedTicket** | When launched via Generic Framework pop-up | MeridianLink provides a 30-minute ticket in the XML handshake. Used as `sTicket` in API calls. |
| **OAuth 2.0** | When triggered manually via dashboard | Uses `client_id` + `client_secret` to get a Bearer token (4-hour lifetime). |

---

## 8. Operating Modes

| Mode | `USE_MOCK` | Description |
|------|-----------|-------------|
| **Simulated** | `true` | Uses 5 realistic mock mortgage documents. No live API needed. Perfect for demos. |
| **Live** | `false` | Connects to MeridianLink via the Generic Framework. Requires API credentials. |

---

## 9. Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Web Server | Express.js |
| API Client | Axios + fast-xml-parser |
| XML Parsing | fast-xml-parser |
| Session IDs | uuid (v4) |
| Frontend | Plain HTML, CSS, JavaScript |
| Configuration | dotenv (.env file) |

---

## 10. MeridianLink Setup (Client Side)

To enable Ocrolus inside MeridianLink, the client registers the vendor:

| Setting | Value |
|---------|-------|
| **Navigate to** | Lender → System Configuration → Generic Framework Vendors |
| **Vendor Name** | `Ocrolus` |
| **Launch URL** | `https://your-deployed-url/api/generic-framework/launch` |
