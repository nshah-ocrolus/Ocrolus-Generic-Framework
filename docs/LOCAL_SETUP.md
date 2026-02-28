# Local Setup Guide

## MeridianLink Generic Framework Integration PoC

Step-by-step guide to run the MeridianLink Generic Framework Integration PoC on your local machine. No prior knowledge of the codebase is needed.

---

## Prerequisites

| Tool | Version | How to Install |
|------|---------|----------------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) — choose LTS. Mac: `brew install node` |
| **npm** | v9+ | Included with Node.js |
| **Git** | Any | Mac: `xcode-select --install`. Windows/Linux: [git-scm.com](https://git-scm.com/) |

**Verify installation:**

```bash
node -v      # Should show v18.x.x or higher
npm -v       # Should show 9.x.x or higher
git --version
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

The application reads settings from a `.env` file. Key settings:

### Mock Mode (Default)

```env
USE_MOCK=true    # Uses simulated MeridianLink data — no API access needed
PORT=4000        # Server port
```

### Live Mode (When API Credentials Are Available)

```env
USE_MOCK=false

# Generic Framework OAuth credentials (from MeridianLink Vendor Portal)
ML_CLIENT_ID=your_client_id
ML_CLIENT_SECRET=your_client_secret

# Generic Framework endpoint
ML_OAUTH_URL=https://playrunner.mortgage.meridianlink.com/oauth/token
ML_BASE_DOMAIN=https://playrunner.mortgage.meridianlink.com
```

---

## Running the Application

### Start the Server

```bash
npm start
```

You'll see:

```
╔══════════════════════════════════════════════════════╗
║   MeridianLink Integration PoC                      ║
╠══════════════════════════════════════════════════════╣
║   Server:    http://localhost:4000                   ║
║   Mode:      SIMULATED (mock)                       ║
║   Env:       development                            ║
╚══════════════════════════════════════════════════════╝
```

### Using the Dashboard

1. Open [http://localhost:4000](http://localhost:4000)
2. Enter a loan number (defaults to `TEST-001`)
3. Click **"Run Integration"**
4. Watch the 4-step pipeline execute:
   - **Authenticate** → Obtains Generic Framework OAuth token
   - **Receive** → Fetches 5 sample mortgage documents
   - **Process** → Applies processing stamps
   - **Return** → Uploads processed documents back
5. Takes ~15 seconds in mock mode
6. Green success message with document counts appears

### Testing with Real Documents

1. Scroll to **"Test With Real Document"** section
2. Drag & drop a PDF (or click to browse)
3. Enter a loan number
4. Click **"Upload & Process"**
5. The document goes through the full Receive → Process → Return pipeline

### Command Line Testing (Optional)

```bash
# Health check
curl http://localhost:4000/api/health

# Run pipeline
curl -X POST http://localhost:4000/api/integration/run \
  -H "Content-Type: application/json" \
  -d '{"loanNumber": "TEST-001"}'

# View history
curl http://localhost:4000/api/integration/history
```

---

## Switching to Live Mode

When MeridianLink provides Generic Framework API credentials:

1. Open `.env`
2. Set `USE_MOCK=false`
3. Add your OAuth credentials:
   ```env
   ML_CLIENT_ID=your_client_id
   ML_CLIENT_SECRET=your_client_secret
   ```
4. Save and restart: `Ctrl+C` then `npm start`
5. Dashboard shows **"Live"** instead of **"Mock Mode"**

---

## Project Structure

```
Ocrolus-Generic-Framework/
├── src/
│   ├── app.js                          # Express server entry point
│   ├── orchestrator.js                 # Pipeline coordinator
│   ├── config/
│   │   └── index.js                    # Environment config loader
│   └── services/
│       ├── meridianlink-client.js      # Generic Framework API client
│       ├── mock-client.js              # Simulated MeridianLink client
│       └── document-processor.js       # Document processing (placeholder)
├── public/
│   ├── index.html                      # Dashboard HTML
│   ├── app.js                          # Dashboard frontend logic
│   └── styles.css                      # Dashboard styling
├── docs/
│   ├── ARCHITECTURE.md                 # System architecture
│   ├── PRD.md                          # Product requirements
│   └── LOCAL_SETUP.md                  # This file
├── .env                                # Environment configuration
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
| **Pipeline fails in Live mode** | Check `ML_CLIENT_ID` and `ML_CLIENT_SECRET` in `.env` |
| **OAuth token error** | Verify `ML_OAUTH_URL` points to `playrunner.mortgage.meridianlink.com/oauth/token` |

---

## Summary

| Action | Command |
|--------|---------|
| Install dependencies | `npm install` |
| Start server | `npm start` |
| Open dashboard | `http://localhost:4000` |
| Stop server | `Ctrl + C` |
| Development mode | `npm run dev` (auto-restarts on file changes) |
