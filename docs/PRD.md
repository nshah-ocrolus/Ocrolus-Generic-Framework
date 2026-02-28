# Product Requirements Document (PRD)

## MeridianLink Generic Framework — Document Integration PoC

**Version:** 2.0  
**Framework:** Generic Framework  
**Phase:** 1 — Proof of Concept  
**Status:** ✅ Complete

---

## 1. Background

We have a product (**Product A / Ocrolus**) that receives mortgage-related documents from another product, processes them (reviews, categorizes, validates), and sends them back.

Currently, Product A integrates with **Encompass** (a major mortgage industry platform). The goal of this project is to build a similar integration with **MeridianLink** — another mortgage platform that stores and manages loan documents.

This PoC uses MeridianLink's **Generic Framework**, their modern integration approach that provides OAuth 2.0 authentication with document services accessed through a single unified domain.

---

## 2. Objective

Build a functional Proof of Concept demonstrating the complete document flow via the Generic Framework:

```
MeridianLink  ──(Receive)──▶  Product A  ──(Return)──▶  MeridianLink
```

1. Product A authenticates with MeridianLink via OAuth 2.0
2. Product A downloads documents for a given loan
3. Product A processes those documents
4. Product A sends processed documents back to MeridianLink

---

## 3. Generic Framework Integration Scope

### What's Included in Phase 1

| Item | Description |
|------|------------|
| **OAuth 2.0 Authentication** | Authenticate using the Generic Framework's OAuth endpoint (`/oauth/token`) |
| **Receive Documents** | List and download all documents attached to a loan number via EDocsService |
| **Process Documents** | Apply placeholder processing (real logic comes in later phases) |
| **Return Documents** | Upload processed documents back to MeridianLink via EDocsService |
| **Web Dashboard** | Visual interface to trigger the pipeline and watch real-time execution |
| **Mock Mode** | Simulation mode using 5 realistic sample mortgage documents |
| **Document Upload** | Upload real PDFs through the dashboard for end-to-end testing |

### What's NOT Included in Phase 1

| Item | Why |
|------|-----|
| Real document processing (OCR, AI classification, compliance) | Phase 1 proves the integration path works |
| Multi-user login / access control | Not needed for a PoC |
| Database storage | Jobs stored in memory — sufficient for demo |
| Production deployment | PoC runs locally |
| Automated test suite | Dev team will add their own tests |
| Error retry / queuing | Production-grade features come after approach is finalized |

---

## 4. Functional Requirements

| # | Requirement | Priority | Status |
|---|------------|----------|--------|
| 1 | Authenticate with MeridianLink via Generic Framework OAuth 2.0 | Must Have | ✅ Done |
| 2 | List all documents for a given loan number | Must Have | ✅ Done |
| 3 | Download each document as a PDF | Must Have | ✅ Done |
| 4 | Process each document (placeholder logic) | Must Have | ✅ Done |
| 5 | Upload processed documents back to MeridianLink | Must Have | ✅ Done |
| 6 | Show pipeline progress in real-time on dashboard | Must Have | ✅ Done |
| 7 | Work in simulation mode without live API access | Must Have | ✅ Done |
| 8 | Upload real documents for testing | Must Have | ✅ Done |
| 9 | Display job history | Should Have | ✅ Done |
| 10 | Auto-refresh OAuth token before expiry | Should Have | ✅ Done |

---

## 5. Technical Requirements

| # | Requirement |
|---|------------|
| 1 | Runs on Node.js 18 or later |
| 2 | Works on macOS, Windows, and Linux |
| 3 | No external databases needed |
| 4 | Configuration through a simple `.env` file |
| 5 | No build step — just `npm install` and `npm start` |
| 6 | All credentials excluded from version control |
| 7 | Single unified domain for all Generic Framework services |

---

## 6. Generic Framework API Interactions

### 6.1 Authentication

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST /oauth/token` |
| **Base URL** | `https://playrunner.mortgage.meridianlink.com` |
| **Method** | `client_credentials` grant type |
| **Input** | `client_id` + `client_secret` (from MeridianLink Vendor Portal) |
| **Output** | `access_token` (Bearer, valid 4 hours) |

### 6.2 List Documents

| Detail | Value |
|--------|-------|
| **Service** | EDocsService (Generic Framework) |
| **Method** | `ListEdocsByLoanNumber` |
| **Input** | Bearer token (as `sTicket`) + Loan number |
| **Output** | List of documents with IDs, names, types, folders |

### 6.3 Download a Document

| Detail | Value |
|--------|-------|
| **Service** | EDocsService (Generic Framework) |
| **Method** | `DownloadEdocsPdfById` |
| **Input** | Bearer token (as `sTicket`) + Document ID |
| **Output** | Base64-encoded PDF content |

### 6.4 Upload a Document

| Detail | Value |
|--------|-------|
| **Service** | EDocsService (Generic Framework) |
| **Method** | `UploadPDFDocument` |
| **Input** | Bearer token + Loan number + Document type + Base64 PDF content |
| **Output** | Upload confirmation |

---

## 7. Application API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check (returns mode: simulated/live) |
| `POST` | `/api/auth/test` | Test MeridianLink Generic Framework authentication |
| `POST` | `/api/integration/run` | Run full Receive → Process → Return pipeline |
| `POST` | `/api/integration/run-with-document` | Run pipeline with uploaded document |
| `GET` | `/api/integration/status` | Check if a pipeline is currently running |
| `GET` | `/api/integration/history` | View all past pipeline runs |
| `GET` | `/api/documents/:loanNumber` | List documents for a specific loan |

---

## 8. Success Criteria

| Criteria | Measurement | Status |
|----------|------------|--------|
| Pipeline runs end-to-end without errors | All 4 steps complete successfully | ✅ Verified |
| Dashboard shows real-time progress | Steps animate as they execute | ✅ Verified |
| Mock mode works without internet | Full flow with simulated data | ✅ Verified |
| Runs on Windows and Mac | `npm install` + `npm start` succeeds | ✅ Verified |
| Credentials are secure | No secrets in codebase | ✅ Verified |
| Processing is swappable | Processing step replaceable without affecting rest | ✅ Verified |
| Generic Framework integration confirmed | OAuth + EDocsService via unified domain | ✅ Verified |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| MeridianLink sandbox unavailable | Can't test with real API | Mock mode provides identical demo capability |
| API contract changes | Integration could break | Defensive XML parsing handles unexpected fields |
| Credential exposure | Security breach | `.env` excluded from version control |
| Scope creep | Delays Phase 1 | This PRD clearly defines in/out of scope |

---

## 10. Phase 1 Deliverables

| Deliverable | Description | Status |
|-------------|------------|--------|
| **Working PoC** | Full Receive → Process → Return pipeline via Generic Framework | ✅ Complete |
| **Architecture Document** | System design, API reference, component overview | ✅ Complete |
| **Product Requirements Document** | This document — scope, requirements, API interactions | ✅ Complete |
| **Local Setup Guide** | Step-by-step guide to run the PoC | ✅ Complete |

---

## 11. Future Phases

| Phase | Focus |
|-------|-------|
| **Phase 2** | Switch from mock to live Generic Framework API with real credentials |
| **Phase 3** | Replace placeholder processing with real OCR / AI classification logic |
| **Phase 4** | Production infrastructure — hosting, monitoring, error handling |
| **Phase 5** | Security hardening, automated testing, CI/CD pipeline |
