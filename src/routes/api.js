/**
 * API Routes
 *
 * REST endpoints for triggering and monitoring the integration pipeline.
 * Includes file upload support for testing with real documents.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} not supported. Allowed: ${allowed.join(', ')}`));
        }
    },
});

module.exports = function createRoutes(orchestrator) {
    // ── Health Check ──────────────────────────────────
    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            mode: orchestrator.client.constructor.name.includes('Mock')
                ? 'simulated'
                : 'live',
            uptime: process.uptime(),
        });
    });

    // ── Test Authentication ───────────────────────────
    router.post('/auth/test', async (req, res) => {
        try {
            const result = await orchestrator.testAuth();
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // ── Run Integration ───────────────────────────────
    router.post('/integration/run', async (req, res) => {
        const { loanNumber } = req.body;

        if (!loanNumber) {
            return res.status(400).json({
                error: 'Missing required field: loanNumber',
                example: { loanNumber: 'TEST-001' },
            });
        }

        // Reject if a job is already running
        const status = orchestrator.getStatus();
        if (status.running) {
            return res.status(409).json({
                error: 'An integration job is already running',
                jobId: status.job.id,
            });
        }

        try {
            const job = await orchestrator.runIntegration(loanNumber);
            res.json(job);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // ── Run Integration with Uploaded Document ────────
    router.post('/integration/run-with-document', upload.single('document'), async (req, res) => {
        const loanNumber = req.body.loanNumber || 'UPLOAD-TEST';

        if (!req.file) {
            return res.status(400).json({
                error: 'No document uploaded. Send a PDF file as "document" field.',
            });
        }

        // Reject if a job is already running
        const status = orchestrator.getStatus();
        if (status.running) {
            return res.status(409).json({
                error: 'An integration job is already running',
                jobId: status.job.id,
            });
        }

        try {
            // Read the uploaded file and convert to base64
            const filePath = req.file.path;
            const fileBuffer = fs.readFileSync(filePath);
            const base64Content = fileBuffer.toString('base64');
            const ext = path.extname(req.file.originalname).toLowerCase();

            const uploadedDoc = {
                guid: `upload-${Date.now()}`,
                name: req.file.originalname,
                type: categorizeDocument(req.file.originalname),
                dateModified: new Date().toISOString(),
                size: req.file.size,
                content: base64Content,
                format: ext.replace('.', ''),
            };

            console.log(`[Upload] Received document: "${req.file.originalname}" (${(req.file.size / 1024).toFixed(1)} KB)`);

            const job = await orchestrator.runIntegrationWithDocuments(loanNumber, [uploadedDoc]);

            // Clean up uploaded file
            fs.unlinkSync(filePath);

            res.json(job);
        } catch (error) {
            // Clean up on error
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ error: error.message });
        }
    });

    // ── Get Current Status ────────────────────────────
    router.get('/integration/status', (req, res) => {
        res.json(orchestrator.getStatus());
    });

    // ── Get Job History ───────────────────────────────
    router.get('/integration/history', (req, res) => {
        res.json(orchestrator.getHistory());
    });

    // ── List Documents (quick test) ───────────────────────
    router.get('/documents/:loanNumber', async (req, res) => {
        try {
            const docs = await orchestrator.client.listDocuments(
                req.params.loanNumber
            );
            res.json({ loanNumber: req.params.loanNumber, documents: docs });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};

/**
 * Simple document categorization based on filename.
 * In production this would use AI/ML classification.
 */
function categorizeDocument(filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('paystub') || lower.includes('pay_stub') || lower.includes('paycheck'))
        return 'Paystub';
    if (lower.includes('w2') || lower.includes('w-2'))
        return 'W-2';
    if (lower.includes('1099'))
        return '1099';
    if (lower.includes('bank') || lower.includes('statement'))
        return 'Bank Statement';
    if (lower.includes('tax') || lower.includes('return'))
        return 'Tax Return';
    if (lower.includes('appraisal'))
        return 'Appraisal';
    if (lower.includes('title'))
        return 'Title';
    if (lower.includes('credit'))
        return 'Credit Report';
    if (lower.includes('1003') || lower.includes('application'))
        return 'Loan Application';
    return 'Other Document';
}
