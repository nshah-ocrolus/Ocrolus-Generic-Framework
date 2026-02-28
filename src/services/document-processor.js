/**
 * Document Processor
 *
 * Performs a dummy processing step on documents received from MeridianLink.
 * In production this would contain real business logic (OCR, validation,
 * data extraction, compliance checks, etc.). For the PoC it simply stamps
 * metadata and adds a simulated processing delay.
 */

const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class DocumentProcessor {
    /**
     * Process a single document.
     *
     * @param {Object} document — { guid, name, type, content }
     * @returns {Object} — processed document with metadata
     */
    async processDocument(document) {
        const startTime = Date.now();

        console.log(`[Processor] Processing "${document.name || document.guid}"...`);

        // Simulate processing delay
        await this._delay(config.processing.delayMs);

        // Build processed result
        const processed = {
            originalGuid: document.guid,
            processedId: uuidv4(),
            name: `PROCESSED_${document.name || 'document.pdf'}`,
            type: document.type || 'Unknown',
            content: this._addProcessingStamp(document.content),
            metadata: {
                processor: 'ProductA-DocumentEngine',
                version: '1.0.0',
                processedAt: new Date().toISOString(),
                processingTimeMs: Date.now() - startTime,
                checks: {
                    formatValidation: 'PASS',
                    contentIntegrity: 'PASS',
                    complianceFlag: 'CLEAR',
                },
            },
            status: 'processed',
        };

        console.log(
            `[Processor] Completed "${processed.name}" in ${processed.metadata.processingTimeMs}ms`
        );

        return processed;
    }

    /**
     * Process multiple documents in sequence.
     * @param {Array} documents
     * @returns {Array} — processed documents
     */
    async processAll(documents) {
        const results = [];
        for (const doc of documents) {
            const processed = await this.processDocument(doc);
            results.push(processed);
        }
        return results;
    }

    /**
     * Stamp the document content with processing metadata.
     * For the PoC this simply prepends a header to the base64 content.
     * In production you would modify the actual PDF.
     */
    _addProcessingStamp(base64Content) {
        const stamp = Buffer.from(
            JSON.stringify({
                stamp: 'ProductA-Processed',
                timestamp: new Date().toISOString(),
                engine: 'v1.0.0',
            })
        ).toString('base64');

        // Return combined content (stamp + original — symbolic only)
        return stamp + (base64Content || '');
    }

    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

module.exports = DocumentProcessor;
