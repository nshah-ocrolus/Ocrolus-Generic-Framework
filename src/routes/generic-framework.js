/**
 * Generic Framework Launch Handler
 *
 * Handles the XML handshake protocol specified by MeridianLink's Generic Framework:
 *
 * 1. MeridianLink POSTs XML (LQBGenericFrameworkRequest) to this endpoint
 *    containing: CredentialXML, LoanNumber, UserLogin, EncryptedTicket
 *
 * 2. We parse the XML, store the ticket in a session, and respond with
 *    XML (LQBGenericFrameworkResponse) containing a PopupURL
 *
 * 3. MeridianLink opens the PopupURL in a modal window
 *
 * 4. The pop-up page uses the stored ticket to call EDocsService APIs
 */

const express = require('express');
const { XMLParser } = require('fast-xml-parser');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
});

// ── In-Memory Session Store ─────────────────────────
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of sessions) {
        if (now > session.expiresAt) {
            sessions.delete(id);
        }
    }
}

// Clean expired sessions periodically (local only — Vercel is stateless)
if (!process.env.VERCEL) {
    setInterval(cleanExpiredSessions, 5 * 60 * 1000);
}

module.exports = function createGenericFrameworkRoutes(orchestrator) {
    router.post('/launch', express.text({ type: ['text/xml', 'application/xml'] }), (req, res) => {
        console.log('[GenericFramework] ─── Incoming Launch Request ───');

        try {
            const xmlBody = req.body;
            if (!xmlBody || typeof xmlBody !== 'string') {
                return res.status(400).type('application/xml').send(buildErrorResponse('No XML body received'));
            }

            console.log('[GenericFramework] Raw XML received (first 500 chars):', xmlBody.substring(0, 500));

            const parsed = xmlParser.parse(xmlBody);
            const request = parsed?.LQBGenericFrameworkRequest;

            if (!request) {
                return res.status(400).type('application/xml').send(
                    buildErrorResponse('Invalid XML — expected LQBGenericFrameworkRequest')
                );
            }

            const loanNumber = request.LoanNumber || '';
            const userLogin = request.UserLogin || '';
            const credentialXML = request.CredentialXML || {};

            const ticketNode = request.LendingQBLoanCredential?.GENERIC_FRAMEWORK_USER_TICKET;
            const encryptedTicket = ticketNode?.['@_EncryptedTicket'] || ticketNode?.EncryptedTicket || '';

            const credentials = credentialXML?.credentials || {};
            const vendorUsername = credentials?.['@_username'] || credentials?.username || '';
            const vendorAccountId = credentials?.['@_accountID'] || credentials?.accountID || '';

            console.log('[GenericFramework] Parsed request:');
            console.log(`  Loan Number:  ${loanNumber}`);
            console.log(`  User Login:   ${userLogin}`);
            console.log(`  Vendor User:  ${vendorUsername}`);
            console.log(`  Account ID:   ${vendorAccountId}`);
            console.log(`  Ticket:       ${encryptedTicket ? encryptedTicket.substring(0, 30) + '...' : '(none)'}`);

            if (!loanNumber) {
                return res.status(400).type('application/xml').send(
                    buildErrorResponse('Missing LoanNumber in request')
                );
            }

            const sessionId = uuidv4();
            sessions.set(sessionId, {
                loanNumber,
                userLogin,
                encryptedTicket,
                vendorUsername,
                vendorAccountId,
                createdAt: Date.now(),
                expiresAt: Date.now() + SESSION_TTL_MS,
            });

            console.log(`[GenericFramework] Session created: ${sessionId}`);

            const config = require('../config');
            const baseUrl = config.app.publicUrl || `http://localhost:${config.app.port}`;
            const popupUrl = `${baseUrl}/launch?sessionId=${sessionId}&loanNumber=${encodeURIComponent(loanNumber)}`;

            console.log(`[GenericFramework] PopupURL: ${popupUrl}`);

            const responseXml = buildSuccessResponse(popupUrl);
            res.type('application/xml').send(responseXml);

            console.log('[GenericFramework] ─── Response sent ───');

        } catch (error) {
            console.error('[GenericFramework] Error processing launch request:', error.message);
            res.status(500).type('application/xml').send(
                buildErrorResponse(`Server error: ${error.message}`)
            );
        }
    });

    router.get('/session/:sessionId', (req, res) => {
        const session = sessions.get(req.params.sessionId);

        if (!session) {
            return res.status(404).json({
                error: 'Session not found or expired',
                hint: 'Sessions expire after 30 minutes',
            });
        }

        if (Date.now() > session.expiresAt) {
            sessions.delete(req.params.sessionId);
            return res.status(410).json({
                error: 'Session has expired',
                hint: 'The MeridianLink ticket is only valid for 30 minutes',
            });
        }

        res.json({
            loanNumber: session.loanNumber,
            userLogin: session.userLogin,
            hasTicket: !!session.encryptedTicket,
            createdAt: new Date(session.createdAt).toISOString(),
            expiresAt: new Date(session.expiresAt).toISOString(),
        });
    });

    router.get('/session/:sessionId/start', async (req, res) => {
        const session = sessions.get(req.params.sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found or expired' });
        }

        if (Date.now() > session.expiresAt) {
            sessions.delete(req.params.sessionId);
            return res.status(410).json({ error: 'Session has expired' });
        }

        const status = orchestrator.getStatus();
        if (status.running) {
            return res.status(409).json({
                error: 'An integration job is already running',
                jobId: status.job.id,
            });
        }

        res.json({
            loanNumber: session.loanNumber,
            status: 'started',
            mode: session.encryptedTicket ? 'ticket' : 'oauth',
        });

        const ticketXml = session.encryptedTicket
            ? `<GENERIC_FRAMEWORK_USER_TICKET EncryptedTicket="${session.encryptedTicket}" />`
            : null;

        orchestrator.runIntegrationWithTicket(session.loanNumber, ticketXml).catch((err) => {
            console.error(`[GenericFramework] Pipeline error for ${session.loanNumber}:`, err.message);
        });
    });

    return router;
};

function buildSuccessResponse(popupUrl) {
    return `<?xml version="1.0" encoding="utf-8"?>
<LQBGenericFrameworkResponse>
  <Window url="${escapeXml(popupUrl)}" height="850" width="650" modalIndicator="Y" />
</LQBGenericFrameworkResponse>`;
}

function buildErrorResponse(message) {
    return `<?xml version="1.0" encoding="utf-8"?>
<LQBGenericFrameworkResponse>
  <Error>${escapeXml(message)}</Error>
</LQBGenericFrameworkResponse>`;
}

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
