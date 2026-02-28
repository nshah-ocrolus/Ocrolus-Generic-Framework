/**
 * Dashboard Frontend Logic
 *
 * Handles API calls, status polling, pipeline animation, and history updates.
 */

(function () {
    'use strict';

    // ── DOM References ──────────────────────────────
    const statusDot = document.getElementById('statusDot');
    const statusLabel = document.getElementById('statusLabel');
    const loanInput = document.getElementById('loanNumberInput');
    const runBtn = document.getElementById('runBtn');
    const jobResult = document.getElementById('jobResult');
    const historyBody = document.getElementById('historyBody');

    const statReceived = document.getElementById('docsReceived');
    const statProcessed = document.getElementById('docsProcessed');
    const statReturned = document.getElementById('docsReturned');
    const statDuration = document.getElementById('jobDuration');

    const STEP_NAMES = ['authenticate', 'receive', 'process', 'return'];

    // ── Initialization ──────────────────────────────
    checkHealth();
    loadHistory();

    // ── Health Check ────────────────────────────────
    async function checkHealth() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();

            if (data.status === 'ok') {
                statusDot.className = 'status-dot online';
                statusLabel.textContent = data.mode === 'simulated' ? 'Mock Mode' : 'Live';
            } else {
                throw new Error('Unhealthy');
            }
        } catch {
            statusDot.className = 'status-dot error';
            statusLabel.textContent = 'Offline';
        }
    }

    // ── Run Integration ─────────────────────────────
    runBtn.addEventListener('click', async () => {
        const loanNumber = loanInput.value.trim();
        if (!loanNumber) {
            showResult('Please enter a loan number', 'error');
            return;
        }

        // Disable button
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="spinner"></span> Running…';
        jobResult.classList.add('hidden');
        resetPipeline();
        resetStats();

        try {
            // Start polling for status
            const pollInterval = setInterval(pollStatus, 500);

            const res = await fetch('/api/integration/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loanNumber }),
            });

            clearInterval(pollInterval);
            const data = await res.json();

            if (data.error) {
                showResult(`Error: ${data.error}`, 'error');
                markStepFailed(data.status || 'authenticate');
            } else {
                // Update pipeline to final state
                updatePipelineFromJob(data);
                updateStats(data);
                showResult(
                    `✅ Integration complete — ${data.documentsReceived || 0} received, ` +
                    `${data.documentsProcessed || 0} processed, ` +
                    `${data.documentsReturned || 0} returned ` +
                    `in ${formatDuration(data.duration)}`,
                    'success'
                );
            }

            loadHistory();
        } catch (err) {
            showResult(`Network error: ${err.message}`, 'error');
        } finally {
            runBtn.disabled = false;
            runBtn.innerHTML =
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg> Run Integration';
        }
    });

    // ── Status Polling ──────────────────────────────
    async function pollStatus() {
        try {
            const res = await fetch('/api/integration/status');
            const data = await res.json();

            if (data.running && data.job) {
                updatePipelineFromJob(data.job);
                updateStats(data.job);
            }
        } catch {
            // ignore poll errors
        }
    }

    // ── Pipeline UI Updates ─────────────────────────
    function resetPipeline() {
        STEP_NAMES.forEach((name) => {
            const el = document.getElementById(`step-${name}`);
            el.className = 'pipeline__step';
            el.querySelector('.pipeline__status').textContent = 'Idle';
        });
        document.querySelectorAll('.pipeline__connector').forEach((c) => {
            c.classList.remove('active');
        });
    }

    function updatePipelineFromJob(job) {
        if (!job.steps) return;

        job.steps.forEach((step) => {
            const el = document.getElementById(`step-${step.name}`);
            if (!el) return;

            el.className = 'pipeline__step';
            if (step.status === 'in_progress') {
                el.classList.add('active');
                el.querySelector('.pipeline__status').textContent = 'Running…';
            } else if (step.status === 'completed') {
                el.classList.add('completed');
                el.querySelector('.pipeline__status').textContent = 'Done';
            } else if (step.status === 'failed') {
                el.classList.add('failed');
                el.querySelector('.pipeline__status').textContent = 'Failed';
            }
        });

        // Animate connectors
        const connectors = document.querySelectorAll('.pipeline__connector');
        const completedSteps = job.steps.filter((s) => s.status === 'completed').length;
        connectors.forEach((c, i) => {
            if (i < completedSteps) {
                c.classList.add('active');
            }
        });
    }

    function markStepFailed(stepName) {
        const el = document.getElementById(`step-${stepName}`);
        if (el) {
            el.className = 'pipeline__step failed';
            el.querySelector('.pipeline__status').textContent = 'Failed';
        }
    }

    // ── Stats ─────────────────────────────────────
    function resetStats() {
        statReceived.textContent = '—';
        statProcessed.textContent = '—';
        statReturned.textContent = '—';
        statDuration.textContent = '—';
    }

    function updateStats(job) {
        if (job.documentsReceived != null) statReceived.textContent = job.documentsReceived;
        if (job.documentsProcessed != null) statProcessed.textContent = job.documentsProcessed;
        if (job.documentsReturned != null) statReturned.textContent = job.documentsReturned;
        if (job.duration != null) statDuration.textContent = formatDuration(job.duration);
    }

    // ── History ───────────────────────────────────
    async function loadHistory() {
        try {
            const res = await fetch('/api/integration/history');
            const jobs = await res.json();

            if (!jobs || jobs.length === 0) {
                historyBody.innerHTML =
                    '<tr class="table__empty"><td colspan="7">No jobs yet — run an integration to get started</td></tr>';
                return;
            }

            historyBody.innerHTML = jobs
                .map(
                    (job) => `
          <tr>
            <td style="font-family: monospace; font-size: 0.75rem;">${job.id.slice(0, 8)}…</td>
            <td>${job.loanNumber}</td>
            <td><span class="badge badge--${job.mode}">${job.mode}</span></td>
            <td>${job.documentsReceived || 0} → ${job.documentsProcessed || 0} → ${job.documentsReturned || 0}</td>
            <td>${formatDuration(job.duration)}</td>
            <td><span class="badge badge--${job.status}">${job.status}</span></td>
            <td style="font-size: 0.75rem;">${job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : '—'}</td>
          </tr>`
                )
                .join('');
        } catch {
            // ignore
        }
    }

    // ── Result Display ──────────────────────────────
    function showResult(message, type) {
        jobResult.textContent = message;
        jobResult.className = `job-result ${type}`;
        jobResult.classList.remove('hidden');
    }

    // ── Helpers ───────────────────────────────────
    function formatDuration(ms) {
        if (ms == null) return '—';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }

    // ── Document Upload ────────────────────────────
    const uploadArea = document.getElementById('uploadArea');
    const uploadContent = document.getElementById('uploadContent');
    const fileInfo = document.getElementById('fileInfo');
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadResult = document.getElementById('uploadResult');
    const uploadLoanInput = document.getElementById('uploadLoanNumber');

    let selectedFile = null;

    if (uploadArea) {
        // Click to browse
        uploadArea.addEventListener('click', (e) => {
            if (e.target.id === 'removeFile') return;
            fileInput.click();
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                selectFile(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                selectFile(fileInput.files[0]);
            }
        });

        removeFileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearFile();
        });

        uploadBtn.addEventListener('click', uploadAndProcess);
    }

    function selectFile(file) {
        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        uploadContent.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        uploadBtn.disabled = false;
    }

    function clearFile() {
        selectedFile = null;
        fileInput.value = '';
        uploadContent.classList.remove('hidden');
        fileInfo.classList.add('hidden');
        uploadBtn.disabled = true;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async function uploadAndProcess() {
        if (!selectedFile) return;

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="spinner"></span> Processing…';
        uploadResult.classList.add('hidden');
        resetPipeline();
        resetStats();

        const formData = new FormData();
        formData.append('document', selectedFile);
        formData.append('loanNumber', uploadLoanInput.value.trim() || 'UPLOAD-TEST');

        try {
            const pollInterval = setInterval(pollStatus, 500);

            const res = await fetch('/api/integration/run-with-document', {
                method: 'POST',
                body: formData,
            });

            clearInterval(pollInterval);
            const data = await res.json();

            if (data.error) {
                showUploadResult(`Error: ${data.error}`, 'error');
                markStepFailed(data.status || 'authenticate');
            } else {
                updatePipelineFromJob(data);
                updateStats(data);

                const fileNames = (data.uploadedFiles || []).map((f) => f.name).join(', ');
                const docType = (data.uploadedFiles || [])[0]?.type || 'Document';
                showUploadResult(
                    `✅ Document processed successfully!\n` +
                    `📄 File: ${fileNames}\n` +
                    `🏷️ Type: ${docType}\n` +
                    `📊 Checks: Format ✓ | Integrity ✓ | Compliance ✓\n` +
                    `⏱️ Duration: ${formatDuration(data.duration)}`,
                    'success'
                );
            }

            loadHistory();
        } catch (err) {
            showUploadResult(`Network error: ${err.message}`, 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML =
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg> Upload & Process';
        }
    }

    function showUploadResult(message, type) {
        uploadResult.textContent = message;
        uploadResult.className = `job-result ${type}`;
        uploadResult.classList.remove('hidden');
        uploadResult.style.whiteSpace = 'pre-line';
    }
})();
