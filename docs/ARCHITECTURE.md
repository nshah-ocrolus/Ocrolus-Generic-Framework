# Product Architecture Document

## MeridianLink Generic Framework — Document Integration PoC

**Version:** 2.0  
**Framework:** Generic Framework (migrated from SOAP-based Web Services)  
**Phase:** 1 — Proof of Concept

---

## 1. Overview

This Proof of Concept demonstrates a document processing pipeline between two systems using MeridianLink's **Generic Framework**:

- **Product A (Ocrolus)** — Our document processing system that reviews, categorizes, and validates mortgage documents
- **Product B (MeridianLink)** — A mortgage industry platform that stores and manages loan documents

### Data Flow

```
  MeridianLink                  Product A                    MeridianLink
  (Document Source)             (Processing Engine)          (Document Destination)
  
  ┌─────────────┐              ┌──────────────────┐         ┌─────────────┐
  │  Loan Docs   │ ──RECEIVE──▶│  Review & Process │──SEND──▶│  Processed  │
  │  (PDFs)      │              │  Documents        │  BACK   │  Documents  │
  └─────────────┘              └──────────────────┘         └─────────────┘
```

Product A connects to MeridianLink via the **Generic Framework**, pulls mortgage documents (loan applications, paystubs, appraisals, etc.), processes them, and sends the processed results back.

---

## 2. Generic Framework Integration

### What is the Generic Framework?

MeridianLink's **Generic Framework** is the modern integration approach that replaces the legacy SOAP-based Web Services model. Key differences:

| Aspect | Legacy (SOAP Web Services) | Generic Framework |
|--------|---------------------------|-------------------|
| **Authentication** | `GetUserAuthTicket` per-request credentials | OAuth 2.0 Bearer tokens via `/oauth/token` |
| **Token Lifetime** | Session-based | 4 hours with auto-refresh |
| **Base Domain** | Separate domains (webservices, edocs) | Single unified domain |
| **Sandbox** | N/A | `playrunner.mortgage.meridianlink.com` |
| **Document Service** | EDocsService.asmx with login credentials | EDocsService.asmx with Bearer token |

### How It Works

The Generic Framework uses **OAuth 2.0 client credentials** for authentication, then passes the Bearer token as the `sTicket` parameter in EDocsService calls:

```
  ┌─────────────┐        OAuth 2.0        ┌─────────────┐
  │  Product A   │ ──── client_id ──────▶  │ MeridianLink │
  │              │ ──── client_secret ──▶  │  /oauth/token │
  │              │ ◀── access_token ─────  │              │
  └──────┬──────┘                          └──────────────┘
         │
         │  Bearer {access_token} as sTicket
         │
         ▼
  ┌─────────────────────────────────────────────────┐
  │  EDocsService.asmx (Generic Framework)              │
  │  ├── ListEdocsByLoanNumber(sTicket, sLNm)           │
  │  ├── DownloadEdocsPdfById(sTicket, docId)           │
  │  └── UploadPDFDocument(sTicket, sLNm, type, data)  │
  └─────────────────────────────────────────────────┘
```

---

## 3. Pipeline Steps

Every integration run follows four steps in order:

| Step | What Happens | Generic Framework API Used |
|------|-------------|--------------------------|
| **1. Authenticate** | Obtain OAuth access token | `POST /oauth/token` with `client_id` + `client_secret` |
| **2. Receive** | List and download documents for a loan | `ListEdocsByLoanNumber` → `DownloadEdocsPdfById` |
| **3. Process** | Process each document (Phase 1: placeholder stamps) | Internal — no API call |
| **4. Return** | Upload processed documents back to the loan | `UploadPDFDocument` |

---

## 4. System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        PoC Application                              │
│                                                                     │
│   ┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│   │  Web Dashboard │    │   Integration   │    │   REST API      │  │
│   │  (Visual UI)   │    │   Orchestrator  │    │   (Endpoints)   │  │
│   └───────────────┘    └────────┬────────┘    └─────────────────┘  │
│                                 │                                   │
│                    ┌────────────┼────────────┐                      │
│                    ▼                         ▼                      │
│         ┌──────────────────┐     ┌──────────────────┐              │
│         │  MeridianLink    │     │  Document         │              │
│         │  Generic Frmwork │     │  Processor         │              │
│         │  Client          │     │                    │              │
│         └────────┬─────────┘     └──────────────────┘              │
│                  │                                                  │
└──────────────────┼──────────────────────────────────────────────┘
                   │
                   │ HTTPS / Generic Framework
                   ▼
          ┌──────────────────┐
          │   MeridianLink   │
          │   Cloud Services │
          │   (PlayRunner    │
          │    Sandbox)      │
          └──────────────────┘
```

### Component Responsibilities

| Component | Role | Description |
|-----------|------|-------------|
| **Web Dashboard** | Visual interface | Browser-based UI to trigger pipelines and watch real-time execution |
| **Integration Orchestrator** | Central controller | Coordinates the 4-step pipeline, tracks progress, maintains job history |
| **REST API** | External endpoints | Allows other systems or CLI tools to trigger and monitor pipelines |
| **MeridianLink Generic Framework Client** | API communication | Handles OAuth auth, XML request/response formatting, and all MeridianLink service calls |
| **Document Processor** | Processing engine | Placeholder in Phase 1 — production would contain OCR, classification, compliance logic |

---

## 5. Generic Framework API Reference

### 5.1 Authentication

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST https://playrunner.mortgage.meridianlink.com/oauth/token` |
| **Content-Type** | `application/x-www-form-urlencoded` |
| **Parameters** | `grant_type=client_credentials`, `client_id`, `client_secret` |
| **Response** | `{ access_token, token_type: "Bearer", expires_in: 14400 }` |
| **Token Lifetime** | 4 hours (auto-refreshes 5 minutes before expiry) |

### 5.2 List Documents

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST https://playrunner.mortgage.meridianlink.com/los/webservice/EDocsService.asmx` |
| **Method** | `ListEdocsByLoanNumber` |
| **Parameters** | `sTicket` (Bearer token), `sLNm` (loan number) |
| **Returns** | XML list of documents with IDs, names, types, folders |

### 5.3 Download Document

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST https://playrunner.mortgage.meridianlink.com/los/webservice/EDocsService.asmx` |
| **Method** | `DownloadEdocsPdfById` |
| **Parameters** | `sTicket` (Bearer token), `docId` (document ID) |
| **Returns** | Base64-encoded PDF content |

### 5.4 Upload Document

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST https://playrunner.mortgage.meridianlink.com/los/webservice/EDocsService.asmx` |
| **Method** | `UploadPDFDocument` |
| **Parameters** | `sTicket`, `sLNm`, `documentType`, `notes`, `sDataContent` (base64 PDF) |
| **Returns** | Upload confirmation |

---

## 6. Operating Modes

| Mode | `USE_MOCK` | Description |
|------|-----------|-------------|
| **Simulated** | `true` | Uses realistic mock data — 5 sample mortgage documents. No live API needed. |
| **Live** | `false` | Connects to MeridianLink PlayRunner sandbox via the Generic Framework. Requires valid `ML_CLIENT_ID` and `ML_CLIENT_SECRET`. |

---

## 7. Technology Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Runtime | Node.js 18+ | Lightweight, cross-platform, great for API integrations |
| Web Server | Express.js | Simple, widely used, easy for developers to understand |
| API Client | Axios + fast-xml-parser | HTTP requests + XML response parsing for Generic Framework |
| Dashboard | Plain HTML, CSS, JavaScript | No build tools needed — opens instantly in any browser |
| Configuration | .env file | Industry-standard secure settings management |

---

## 8. Security

- **Credentials never stored in code** — `.env` file excluded from version control
- **OAuth tokens auto-refresh** — new token requested before expiry
- **No sensitive data logged** — passwords and tokens redacted from console output
- **HTTPS only** — all MeridianLink communication over encrypted connections
- **Single domain** — Generic Framework uses one unified encrypted endpoint
