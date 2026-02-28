/**
 * Integration Orchestrator (Generic Framework)
 *
 * Central controller for the Receive → Process → Return document flow.
 * Coordinates the MeridianLink Generic Framework client and document processor
 * to execute end-to-end integration jobs, tracks status, and maintains history.
 */

const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const MeridianLinkClient = require('./services/meridianlink-client');
const MockMeridianLinkClient = require('./services/mock-client');
const DocumentProcessor = require('./services/document-processor');

class Orchestrator {
    constructor() {
        this.client = config.app.useMock
            ? new MockMeridianLinkClient()
            : new MeridianLinkClient();

        this.processor = new DocumentProcessor();
        this.jobs = [];
        this.currentJob = null;
    }

    /**
     * Execute the full integration pipeline for a loan.
     */
    async runIntegration(loanNumber) {
        const job = {
            id: uuidv4(),
            loanNumber,
            status: 'starting',
            mode: config.app.useMock ? 'simulated' : 'live',
            steps: [],
            startedAt: new Date().toISOString(),
            completedAt: null,
            error: null,
        };

        this.currentJob = job;
        this.jobs.push(job);

        try {
            // Step 1: Authenticate
            this._updateStep(job, 'authenticate', 'in_progress', 'Authenticating with MeridianLink...');
            const authResult = await this.client.authenticate();
            this._updateStep(job, 'authenticate', 'completed', 'Authenticated — ticket obtained');

            // Step 2: Receive (Fetch Documents)
            this._updateStep(job, 'receive', 'in_progress', `Fetching documents for loan ${loanNumber}...`);
            const documents = await this.client.listDocuments(loanNumber);

            if (!documents || documents.length === 0) {
                this._updateStep(job, 'receive', 'completed', 'No documents found — using sample set');
            } else {
                this._updateStep(job, 'receive', 'in_progress', `Found ${documents.length} documents. Downloading...`);
            }

            // Download each document
            const downloadedDocs = [];
            for (const doc of documents) {
                const downloaded = await this.client.downloadDocument(doc.guid);
                downloadedDocs.push({
                    ...doc,
                    content: downloaded.content,
                });
            }

            this._updateStep(
                job,
                'receive',
                'completed',
                `Received ${downloadedDocs.length} documents from MeridianLink`
            );
            job.documentsReceived = downloadedDocs.length;

            // Step 3: Process
            this._updateStep(job, 'process', 'in_progress', `Processing ${downloadedDocs.length} documents...`);
            const processedDocs = await this.processor.processAll(downloadedDocs);
            this._updateStep(
                job,
                'process',
                'completed',
                `Processed ${processedDocs.length} documents successfully`
            );
            job.documentsProcessed = processedDocs.length;

            // Step 4: Return (Upload Back)
            this._updateStep(job, 'return', 'in_progress', `Uploading ${processedDocs.length} processed documents...`);
            const uploadResults = [];
            for (const doc of processedDocs) {
                const result = await this.client.uploadDocument(
                    loanNumber,
                    `Processed - ${doc.type}`,
                    doc.content,
                    `Processed by ProductA at ${doc.metadata.processedAt}`
                );
                uploadResults.push(result);
            }

            this._updateStep(
                job,
                'return',
                'completed',
                `Returned ${uploadResults.length} processed documents to MeridianLink`
            );
            job.documentsReturned = uploadResults.length;

            // Complete
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.duration = new Date(job.completedAt) - new Date(job.startedAt);

            console.log(`\n[Orchestrator] Job ${job.id} completed in ${job.duration}ms`);
            console.log(`  Received: ${job.documentsReceived} | Processed: ${job.documentsProcessed} | Returned: ${job.documentsReturned}\n`);

        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date().toISOString();
            console.error(`[Orchestrator] Job ${job.id} failed: ${error.message}`);

            const inProgress = job.steps.find((s) => s.status === 'in_progress');
            if (inProgress) {
                inProgress.status = 'failed';
                inProgress.message = error.message;
            }
        }

        this.currentJob = null;
        return job;
    }

    /**
     * Execute the pipeline with pre-loaded documents (e.g. from file upload).
     * Skips the MeridianLink fetch step — goes straight to Process → Return.
     */
    async runIntegrationWithDocuments(loanNumber, documents) {
        const job = {
            id: uuidv4(),
            loanNumber,
            status: 'starting',
            mode: 'document-upload',
            steps: [],
            startedAt: new Date().toISOString(),
            completedAt: null,
            error: null,
        };

        this.currentJob = job;
        this.jobs.push(job);

        try {
            this._updateStep(job, 'authenticate', 'in_progress', 'Authenticating (document upload mode)...');
            await new Promise((r) => setTimeout(r, 300));
            this._updateStep(job, 'authenticate', 'completed', 'Authenticated — document upload mode');

            this._updateStep(job, 'receive', 'in_progress', `Receiving ${documents.length} uploaded document(s)...`);
            await new Promise((r) => setTimeout(r, 500));

            const docNames = documents.map((d) => d.name).join(', ');
            this._updateStep(
                job,
                'receive',
                'completed',
                `Received ${documents.length} document(s): ${docNames}`
            );
            job.documentsReceived = documents.length;
            job.uploadedFiles = documents.map((d) => ({
                name: d.name,
                type: d.type,
                size: d.size,
                format: d.format,
            }));

            this._updateStep(job, 'process', 'in_progress', `Processing ${documents.length} document(s)...`);
            const processedDocs = await this.processor.processAll(documents);
            this._updateStep(
                job,
                'process',
                'completed',
                `Processed ${processedDocs.length} document(s) successfully`
            );
            job.documentsProcessed = processedDocs.length;

            job.processingResults = processedDocs.map((d) => ({
                name: d.name,
                type: d.type,
                originalGuid: d.originalGuid,
                processedId: d.processedId,
                checks: d.metadata.checks,
                processingTimeMs: d.metadata.processingTimeMs,
            }));

            this._updateStep(job, 'return', 'in_progress', `Uploading ${processedDocs.length} processed document(s)...`);
            const uploadResults = [];
            for (const doc of processedDocs) {
                const result = await this.client.uploadDocument(
                    loanNumber,
                    `Processed - ${doc.type}`,
                    doc.content,
                    `Processed by ProductA at ${doc.metadata.processedAt}`
                );
                uploadResults.push(result);
            }

            this._updateStep(
                job,
                'return',
                'completed',
                `Returned ${uploadResults.length} processed document(s) to MeridianLink`
            );
            job.documentsReturned = uploadResults.length;

            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.duration = new Date(job.completedAt) - new Date(job.startedAt);

            console.log(`\n[Orchestrator] Upload Job ${job.id} completed in ${job.duration}ms`);
            console.log(`  Files: ${docNames}`);
            console.log(`  Received: ${job.documentsReceived} | Processed: ${job.documentsProcessed} | Returned: ${job.documentsReturned}\n`);

        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date().toISOString();
            console.error(`[Orchestrator] Upload Job ${job.id} failed: ${error.message}`);

            const inProgress = job.steps.find((s) => s.status === 'in_progress');
            if (inProgress) {
                inProgress.status = 'failed';
                inProgress.message = error.message;
            }
        }

        this.currentJob = null;
        return job;
    }

    /** Test authentication only */
    async testAuth() {
        try {
            const result = await this.client.authenticate();
            return { success: true, ...result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute the pipeline using a MeridianLink Generic Framework EncryptedTicket.
     *
     * When MeridianLink triggers the pop-up, it provides an EncryptedTicket
     * (valid 30 min) that replaces OAuth for API calls.
     */
    async runIntegrationWithTicket(loanNumber, ticketXml) {
        if (ticketXml && !this.client.constructor.name.includes('Mock')) {
            this.client.setTicketOverride(ticketXml);
        }

        try {
            return await this.runIntegration(loanNumber);
        } finally {
            if (this.client.clearTicketOverride) {
                this.client.clearTicketOverride();
            }
        }
    }

    /** Get current job status */
    getStatus() {
        if (this.currentJob) {
            return { running: true, job: this.currentJob };
        }
        return { running: false, lastJob: this.jobs[this.jobs.length - 1] || null };
    }

    /** Get full job history */
    getHistory() {
        return [...this.jobs].reverse();
    }

    // ── Internal Helpers ──────────────────────────────

    _updateStep(job, stepName, status, message) {
        const existing = job.steps.find((s) => s.name === stepName);
        if (existing) {
            existing.status = status;
            existing.message = message;
            existing.updatedAt = new Date().toISOString();
        } else {
            job.steps.push({
                name: stepName,
                status,
                message,
                startedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
        job.status = stepName;
        console.log(`[Orchestrator] [${stepName.toUpperCase()}] ${message}`);
    }
}

module.exports = Orchestrator;
