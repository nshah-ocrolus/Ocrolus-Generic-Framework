/**
 * Mock MeridianLink Client (Generic Framework)
 *
 * Drop-in replacement for the real MeridianLink Generic Framework client.
 * Returns realistic simulated responses so the full Receive → Process → Return
 * flow can be demonstrated without live API access.
 */

const { v4: uuidv4 } = require('uuid');

// Sample mortgage document types and names
const MOCK_DOCUMENTS = [
    {
        guid: uuidv4(),
        name: '1003_Uniform_Residential_Loan_Application.pdf',
        type: 'Loan Application',
        dateModified: new Date().toISOString(),
        size: 245760,
    },
    {
        guid: uuidv4(),
        name: 'Property_Appraisal_Report.pdf',
        type: 'Appraisal',
        dateModified: new Date().toISOString(),
        size: 1048576,
    },
    {
        guid: uuidv4(),
        name: 'Borrower_Credit_Report.pdf',
        type: 'Credit Report',
        dateModified: new Date().toISOString(),
        size: 153600,
    },
    {
        guid: uuidv4(),
        name: 'Title_Insurance_Commitment.pdf',
        type: 'Title',
        dateModified: new Date().toISOString(),
        size: 204800,
    },
    {
        guid: uuidv4(),
        name: 'Employment_Verification_Letter.pdf',
        type: 'VOE',
        dateModified: new Date().toISOString(),
        size: 102400,
    },
];

// Simulated base64-encoded PDF
const MOCK_PDF_BASE64 =
    'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5k' +
    'b2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4K' +
    'ZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3gg' +
    'WzAgMCA2MTIgNzkyXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAow';

class MockMeridianLinkClient {
    constructor() {
        this.ticket = null;
        this.ticketExpiry = null;
        this.uploadedDocs = [];
    }

    /** No-op — mock doesn't need real tickets */
    setTicketOverride() { }
    clearTicketOverride() { }

    /** Simulate authentication */
    async authenticate() {
        await this._delay(300);
        this.ticket = `MOCK-TICKET-${uuidv4().slice(0, 8)}`;
        this.ticketExpiry = Date.now() + 25 * 60 * 1000;
        console.log(`[MockClient] Authenticated — ticket: ${this.ticket}`);
        return { success: true, ticket: this.ticket };
    }

    async ensureAuth() {
        if (!this.ticket || Date.now() > this.ticketExpiry) {
            await this.authenticate();
        }
        return this.ticket;
    }

    /** Return simulated document list for any loan number */
    async listDocuments(loanNumber) {
        await this.ensureAuth();
        await this._delay(500);
        const docs = MOCK_DOCUMENTS.map((d) => ({
            ...d,
            guid: uuidv4(),
        }));
        console.log(
            `[MockClient] Listed ${docs.length} documents for loan ${loanNumber}`
        );
        return docs;
    }

    /** Return simulated PDF content */
    async downloadDocument(docGuid) {
        await this.ensureAuth();
        await this._delay(400);
        console.log(`[MockClient] Downloaded document ${docGuid}`);
        return {
            guid: docGuid,
            content: MOCK_PDF_BASE64,
            format: 'pdf',
        };
    }

    /** Simulate upload and store record */
    async uploadDocument(loanNumber, documentType, base64Content, notes = '') {
        await this.ensureAuth();
        await this._delay(600);
        const record = {
            id: uuidv4(),
            loanNumber,
            documentType,
            notes,
            contentLength: base64Content.length,
            uploadedAt: new Date().toISOString(),
        };
        this.uploadedDocs.push(record);
        console.log(
            `[MockClient] Uploaded "${documentType}" to loan ${loanNumber}`
        );
        return { success: true, ...record };
    }

    /** Get all mock-uploaded documents (for inspection) */
    getUploadedDocuments() {
        return this.uploadedDocs;
    }

    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

module.exports = MockMeridianLinkClient;
