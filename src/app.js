/**
 * Express Application Entry Point
 *
 * Boots the server, mounts API routes, and serves the dashboard.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const Orchestrator = require('./orchestrator');
const createRoutes = require('./routes/api');
const createGenericFrameworkRoutes = require('./routes/generic-framework');

const app = express();

// ── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/xml' }));
app.use(express.text({ type: 'application/xml' }));
app.use(express.urlencoded({ extended: true }));

// ── Resolve public directory (works both locally and on Vercel) ──
const publicDir = path.join(__dirname, '..', 'public');

// ── Static Dashboard ────────────────────────────────
app.use(express.static(publicDir));

// ── API Routes ──────────────────────────────────────
const orchestrator = new Orchestrator();
app.use('/api', createRoutes(orchestrator));

// ── Generic Framework XML Handshake ─────────────────
app.use('/api/generic-framework', createGenericFrameworkRoutes(orchestrator));

// ── Launch URL (Pop-Up Integration) ─────────────────
app.get('/launch', (req, res) => {
    res.sendFile(path.join(publicDir, 'launch.html'));
});

// ── Fallback to dashboard ───────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Start Server (only when running locally, not on Vercel) ──
if (!process.env.VERCEL) {
    app.listen(config.app.port, () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║   Ocrolus — MeridianLink Integration PoC            ║');
        console.log('╠══════════════════════════════════════════════════════╣');
        console.log(`║   Server:    http://localhost:${config.app.port}                 ║`);
        console.log(`║   Mode:      ${config.app.useMock ? 'SIMULATED (mock)' : 'LIVE (MeridianLink API)'}            ║`);
        console.log(`║   Env:       ${config.app.env}                      ║`);
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
    });
}

module.exports = app;
