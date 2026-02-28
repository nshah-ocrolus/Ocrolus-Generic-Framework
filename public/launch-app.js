/**
 * Launch Page Frontend Logic
 *
 * Auto-reads loanNumber from URL, kicks off the pipeline,
 * and polls for status updates to animate the step progress.
 * Sends postMessage to opener/parent when complete.
 */

(function () {
    'use strict';

    // ── DOM References ──────────────────────────────
    const vendorTitle = document.getElementById('vendorTitle');
    const modeBadge = document.getElementById('modeBadge');
    const modeLabel = document.getElementById('modeLabel');
    const errorState = document.getElementById('errorState');
    const processingState = document.getElementById('processingState');
    const loanDisplay = document.getElementById('loanDisplay');
    const summaryCard = document.getElementById('summaryCard');
    const summaryHeader = document.getElementById('summaryHeader');
    const summaryTitle = document.getElementById('summaryTitle');
    const closeBtn = document.getElementById('closeBtn');
    const footerVendor = document.getElementById('footerVendor');

    const STEP_NAMES = ['authenticate', 'receive', 'process', 'return'];
    let pollInterval = null;

    // ── Read parameters from URL ─────────────────────
    const params = new URLSearchParams(window.location.search);
    const loanNumber = params.get('loanNumber') || params.get('loannumber') || params.get('loan');
    const sessionId = params.get('sessionId');

    // ── Initialize ──────────────────────────────────
    init();

    async function init() {
        // Load vendor config
        try {
            const cfgRes = await fetch('/api/launch/config');
            const cfg = await cfgRes.json();
            if (cfg.vendorName) {
                vendorTitle.textContent = cfg.vendorName;
                footerVendor.textContent = cfg.vendorName;
                document.title = `${cfg.vendorName} — Document Processing`;
            }
            modeBadge.classList.add(cfg.mode === 'live' ? 'live' : 'mock');
            modeLabel.textContent = cfg.mode === 'live' ? 'Live' : 'Simulated';
        } catch {
            modeLabel.textContent = 'Offline';
            modeBadge.classList.add('offline');
        }

        // Validate loan number
        if (!loanNumber) {
            errorState.classList.remove('hidden');
            processingState.classList.add('hidden');
            return;
        }

        // Show loan number and start pipeline
        loanDisplay.textContent = loanNumber;
        startPipeline();
    }

    // ── Start Pipeline ──────────────────────────────
    async function startPipeline() {
        // Mark first step as active
        setStepState('authenticate', 'active', 'Connecting to MeridianLink…');

        try {
            let startUrl;

            if (sessionId) {
                // Generic Framework launch — use session endpoint
                // (MeridianLink triggered the XML handshake, ticket is stored server-side)
                startUrl = `/api/generic-framework/session/${sessionId}/start`;
            } else {
                // Simple launch — direct URL launch
                startUrl = `/api/launch/start?loanNumber=${encodeURIComponent(loanNumber)}`;
            }

            const res = await fetch(startUrl);
            const data = await res.json();

            if (data.error) {
                showError(data.error);
                return;
            }

            // Start polling for status
            pollInterval = setInterval(pollStatus, 400);
        } catch (err) {
            showError(`Failed to connect: ${err.message}`);
        }
    }

    // ── Status Polling ──────────────────────────────
    async function pollStatus() {
        try {
            const res = await fetch('/api/integration/status');
            const data = await res.json();

            if (data.running && data.job) {
                updateFromJob(data.job);
            } else if (!data.running && data.lastJob) {
                // Pipeline finished
                clearInterval(pollInterval);
                updateFromJob(data.lastJob);
                showCompletion(data.lastJob);
            }
        } catch {
            // ignore poll errors
        }
    }

    // ── Update Steps from Job ───────────────────────
    function updateFromJob(job) {
        if (!job.steps) return;

        job.steps.forEach((step) => {
            const detail = document.getElementById(`detail-${step.name}`);
            if (step.status === 'in_progress') {
                setStepState(step.name, 'active', step.message || 'In progress…');
            } else if (step.status === 'completed') {
                setStepState(step.name, 'completed', step.message || 'Done');
            } else if (step.status === 'failed') {
                setStepState(step.name, 'failed', step.message || 'Failed');
            }
        });
    }

    function setStepState(stepName, state, message) {
        const el = document.getElementById(`lstep-${stepName}`);
        if (!el) return;

        // Reset classes
        el.classList.remove('active', 'completed', 'failed');
        el.classList.add(state);

        const detail = document.getElementById(`detail-${stepName}`);
        if (detail && message) {
            detail.textContent = message;
        }
    }

    // ── Completion ──────────────────────────────────
    function showCompletion(job) {
        summaryCard.classList.remove('hidden');

        if (job.status === 'completed') {
            summaryHeader.classList.add('success');
            summaryTitle.textContent = 'Processing Complete';
        } else {
            summaryHeader.classList.add('failed');
            summaryTitle.textContent = 'Processing Failed';
            closeBtn.textContent = 'Close Window';
        }

        document.getElementById('sumReceived').textContent = job.documentsReceived || 0;
        document.getElementById('sumProcessed').textContent = job.documentsProcessed || 0;
        document.getElementById('sumReturned').textContent = job.documentsReturned || 0;
        document.getElementById('sumDuration').textContent = formatDuration(job.duration);

        // Notify parent/opener that processing is complete
        notifyParent(job);
    }

    function showError(message) {
        clearInterval(pollInterval);
        // Find the first active or waiting step and mark it failed
        for (const name of STEP_NAMES) {
            const el = document.getElementById(`lstep-${name}`);
            if (el && !el.classList.contains('completed')) {
                setStepState(name, 'failed', message);
                break;
            }
        }

        summaryCard.classList.remove('hidden');
        summaryHeader.classList.add('failed');
        summaryTitle.textContent = `Error: ${message}`;
    }

    // ── Parent Communication ────────────────────────
    function notifyParent(job) {
        const message = {
            type: 'ocrolus-integration-complete',
            loanNumber: job.loanNumber,
            status: job.status,
            documentsReceived: job.documentsReceived || 0,
            documentsProcessed: job.documentsProcessed || 0,
            documentsReturned: job.documentsReturned || 0,
            duration: job.duration,
        };

        // Try opener (pop-up) then parent (iframe)
        if (window.opener) {
            window.opener.postMessage(message, '*');
        }
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, '*');
        }
    }

    // ── Close Button ────────────────────────────────
    closeBtn.addEventListener('click', () => {
        // Final notification
        if (window.opener) {
            window.opener.postMessage({ type: 'ocrolus-window-closed' }, '*');
        }
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'ocrolus-window-closed' }, '*');
        }
        window.close();
    });

    // ── Helpers ─────────────────────────────────────
    function formatDuration(ms) {
        if (ms == null) return '—';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }
})();
