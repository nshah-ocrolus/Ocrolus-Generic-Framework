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

const app = express();

// ── Middleware ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static Dashboard ────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API Routes ──────────────────────────────────────
const orchestrator = new Orchestrator();
app.use('/api', createRoutes(orchestrator));

// ── Fallback to dashboard ───────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start Server ────────────────────────────────────
app.listen(config.app.port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   MeridianLink Integration PoC                      ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║   Server:    http://localhost:${config.app.port}                 ║`);
    console.log(`║   Mode:      ${config.app.useMock ? 'SIMULATED (mock)' : 'LIVE (MeridianLink API)'}            ║`);
    console.log(`║   Env:       ${config.app.env}                      ║`);
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
