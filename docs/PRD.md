# Product Requirements Document (PRD)

## Ocrolus — MeridianLink Generic Framework Integration

**Version:** 3.0  
**Integration Method:** Generic Framework (Launch URL / Pop-Up)  
**Phase:** 1 — Proof of Concept  
**Status:** ✅ Complete

---

## 1. Background

We have a product (**Ocrolus / Product A**) that receives mortgage-related documents from another product, processes them (reviews, categorizes, validates), and sends them back.

Currently, Ocrolus integrates with **Encompass** (a major mortgage industry platform). The goal of this project is to build a similar integration with **MeridianLink** — another mortgage platform that stores and manages loan documents.

### Integration Method

MeridianLink offers a **Generic Framework (Hyperlink) integration** designed for vendors without a dedicated framework. This approach uses a **launch URL mechanism** where MeridianLink triggers the vendor's UI in a pop-up window. The vendor receives documents, processes them, and returns them — all within the pop-up.

---

## 2. Objective

Build a functional Proof of Concept demonstrating the complete document flow using the Generic Framework pop-up integration:

```
  MeridianLink User clicks "Ocrolus" in a loan
        │
        ▼
  MeridianLink POSTs XML to our Launch URL
        │
        ▼
  Our app responds with a PopupURL
        │
        ▼
  Pop-up opens → Receives docs → Processes → Returns → Done
```

---

## 3. What's Included in Phase 1

| Item | Description | Status |
|------|------------|--------|
| **Generic Framework XML Handshake** | Receive XML POST from MeridianLink, respond with PopupURL | ✅ Done |
| **Pop-Up Window** | Auto-runs pipeline with real-time progress animation | ✅ Done |
| **Session Management** | Store EncryptedTicket in 30-minute session | ✅ Done |
| **Receive Documents** | List and download documents for a loan (mock mode) | ✅ Done |
| **Process Documents** | Apply placeholder processing (real logic in later phases) | ✅ Done |
| **Return Documents** | Upload processed documents back to MeridianLink (mock mode) | ✅ Done |
| **Admin Dashboard** | Internal UI for manual testing and job history | ✅ Done |
| **Mock Mode** | Simulation using 5 realistic sample mortgage documents | ✅ Done |
| **Parent Communication** | postMessage to MeridianLink when processing completes | ✅ Done |

### What's NOT Included in Phase 1

| Item | Why |
|------|-----|
| Real document processing (OCR, AI classification) | Phase 1 proves the integration path works |
| Real MeridianLink API calls | Requires API credentials (Phase 2) |
| Ocrolus processing integration | Requires Ocrolus API keys (Phase 2) |
| Multi-user login / access control | Not needed for a PoC |
| Database storage | Jobs stored in memory — sufficient for demo |
| Production deployment / HTTPS | PoC runs locally or on Vercel |

---

## 4. How the Integration Works

### 4.1 MeridianLink Setup (One-Time)

The client registers Ocrolus as a vendor in MeridianLink:

1. Navigate to **Lender → System Configuration → Generic Framework Vendors**
2. Add: **Vendor Name** = `Ocrolus`, **Launch URL** = `https://your-url/api/generic-framework/launch`
3. Save

### 4.2 User Flow

1. MeridianLink user opens a loan file
2. Clicks **"Ocrolus"** link
3. MeridianLink POSTs XML (containing LoanNumber, EncryptedTicket) to the Launch URL
4. The app responds with XML containing the PopupURL
5. MeridianLink opens the pop-up window
6. Pop-up automatically runs: Authenticate → Receive → Process → Return
7. User sees "Processing Complete" with document counts
8. User clicks "Done — Close Window"

### 4.3 XML Protocol

**MeridianLink sends:**
```xml
<LQBGenericFrameworkRequest>
  <LoanNumber>LN-2026-001</LoanNumber>
  <UserLogin>rseward</UserLogin>
  <LendingQBLoanCredential>
    <GENERIC_FRAMEWORK_USER_TICKET EncryptedTicket="..." />
  </LendingQBLoanCredential>
</LQBGenericFrameworkRequest>
```

**App responds:**
```xml
<LQBGenericFrameworkResponse>
  <Window url="https://your-url/launch?sessionId=UUID&amp;loanNumber=LN-2026-001"
          height="850" width="650" modalIndicator="Y" />
</LQBGenericFrameworkResponse>
```

---

## 5. Application Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/generic-framework/launch` | XML handshake (MeridianLink calls this) |
| `GET` | `/api/generic-framework/session/:id` | Session lookup (pop-up validates session) |
| `GET` | `/api/generic-framework/session/:id/start` | Start pipeline with session ticket |
| `GET` | `/launch` | Serves the pop-up HTML page |
| `GET` | `/api/launch/config` | Returns vendor branding for pop-up |
| `GET` | `/api/integration/status` | Pipeline progress (polled by pop-up) |
| `POST` | `/api/integration/run` | Manual pipeline trigger (dashboard) |
| `GET` | `/api/integration/history` | View past pipeline runs |
| `GET` | `/api/health` | Server health check |

---

## 6. Success Criteria

| Criteria | Status |
|----------|--------|
| XML handshake works (POST XML → PopupURL response) | ✅ Verified |
| Pop-up opens and auto-runs pipeline | ✅ Verified |
| All 4 pipeline steps complete successfully | ✅ Verified |
| Pop-up shows real-time step progress | ✅ Verified |
| Mock mode works without internet | ✅ Verified |
| postMessage sent to MeridianLink on completion | ✅ Verified |
| Runs on Windows and Mac | ✅ Verified |
| Credentials are secure (not in code) | ✅ Verified |

---

## 7. Phase 1 Deliverables

| Deliverable | Status |
|-------------|--------|
| **Working PoC** — Generic Framework pop-up integration with mock data | ✅ Complete |
| **Product Architecture** — System design, XML protocol, data flow | ✅ Complete |
| **Product Requirements** — This document | ✅ Complete |
| **Local Setup Guide** — Step-by-step guide to run the PoC | ✅ Complete |

---

## 8. Future Phases

| Phase | Focus |
|-------|-------|
| **Phase 2** | Connect to real MeridianLink API with live credentials + real Ocrolus processing |
| **Phase 3** | Production deployment — hosting, HTTPS, monitoring, error handling |
| **Phase 4** | Security hardening, automated testing, CI/CD pipeline |
