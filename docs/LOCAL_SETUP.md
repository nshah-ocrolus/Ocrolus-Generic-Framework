# Local Setup Guide

## Ocrolus — MeridianLink Generic Framework Integration

Step-by-step guide to run the Ocrolus–MeridianLink Generic Framework Integration PoC on your local machine.

---

## Prerequisites

| Tool | Version | How to Install |
|------|---------|----------------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) — choose LTS |
| **npm** | v9+ | Included with Node.js |
| **Git** | Any | [git-scm.com](https://git-scm.com/) |

**Verify installation:**

```bash
node -v      # Should show v18.x.x or higher
npm -v       # Should show 9.x.x or higher
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/nshah-ocrolus/Ocrolus-Generic-Framework.git
cd Ocrolus-Generic-Framework

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Start the server
npm start

# 5. Open the dashboard
# Navigate to http://localhost:4000 in your browser
```

---

## Configuration

The application reads settings from a `.env` file.

### Mock Mode (Default — No API Needed)

```env
USE_MOCK=true
PORT=4000
VENDOR_NAME=Ocrolus
PUBLIC_URL=http://localhost:4000
```

### Live Mode (When API Credentials Are Available)

```env
USE_MOCK=false

# Generic Framework OAuth credentials (from MeridianLink Vendor Portal)
ML_CLIENT_ID=your_client_id
ML_CLIENT_SECRET=your_client_secret

# Generic Framework endpoints
ML_OAUTH_URL=https://playrunner.mortgage.meridianlink.com/oauth/token
ML_BASE_DOMAIN=https://playrunner.mortgage.meridianlink.com

# Your public URL (where MeridianLink can reach your app)
PUBLIC_URL=https://your-deployed-url.com
```

---

## Testing the Pop-Up Integration

### Option 1: Simulate the MeridianLink XML Handshake

You can test the full Generic Framework flow locally using curl:

```bash
# Send a simulated MeridianLink XML request
curl -X POST http://localhost:4000/api/generic-framework/launch \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0" encoding="utf-8"?>
<LQBGenericFrameworkRequest>
  <LoanNumber>TEST-LOAN-001</LoanNumber>
  <UserLogin>testuser</UserLogin>
  <LendingQBLoanCredential>
    <GENERIC_FRAMEWORK_USER_TICKET EncryptedTicket="demo-ticket-123" />
  </LendingQBLoanCredential>
</LQBGenericFrameworkRequest>'
```

This returns an XML response with a PopupURL. Open that URL in your browser to see the pop-up.

### Option 2: Direct Pop-Up URL

Open this URL directly in your browser:

```
http://localhost:4000/launch?loanNumber=TEST-001
```

This shows the pop-up window without the XML handshake (simple launch mode).

### Option 3: Admin Dashboard

1. Open [http://localhost:4000](http://localhost:4000)
2. Enter a loan number
3. Click **"Run Integration"**
4. Watch the 4-step pipeline execute in real-time

---

## What You'll See

### Pop-Up Window (launched by MeridianLink)

The pop-up shows 4 pipeline steps with live progress:

1. **Authenticate** — Connects to MeridianLink
2. **Receive Documents** — Fetches 5 sample mortgage documents
3. **Process Documents** — Processes each document
4. **Return to MeridianLink** — Uploads processed documents back

After completion, you see a summary with document counts and a "Done — Close Window" button.

### Admin Dashboard

The dashboard at [http://localhost:4000](http://localhost:4000) shows:
- Manual pipeline trigger
- Real-time job progress
- Job history with document counts and durations

---

## Deploying for MeridianLink Integration

To connect this to a real MeridianLink instance:

1. **Deploy the app online** (Vercel, Railway, Render, etc.)
2. **Set the `PUBLIC_URL`** environment variable to your deployed URL
3. **Register in MeridianLink**: Lender → System Config → Generic Framework Vendors → Add `Ocrolus` with your Launch URL

---

## Project Structure

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
│       ├── meridianlink-client.js      # MeridianLink API client
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
│   ├── ARCHITECTURE.md                 # System architecture
│   ├── PRD.md                          # Product requirements
│   └── LOCAL_SETUP.md                  # This file
├── .env.example                        # Config template
├── package.json                        # Dependencies
└── README.md                           # Quick start
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **`command not found: node`** | Install Node.js from [nodejs.org](https://nodejs.org/) |
| **`EADDRINUSE: port 4000`** | Another app is using port 4000. Change `PORT=4001` in `.env` |
| **`Cannot find module`** | Run `npm install` in the project folder |
| **Dashboard shows "Offline"** | Server isn't running — run `npm start` |
| **Pop-up shows "Missing Loan Number"** | Open with `?loanNumber=TEST-001` in the URL |

---

## Summary

| Action | Command |
|--------|---------|
| Install dependencies | `npm install` |
| Start server | `npm start` |
| Open dashboard | `http://localhost:4000` |
| Test pop-up | `http://localhost:4000/launch?loanNumber=TEST-001` |
| Stop server | `Ctrl + C` |
