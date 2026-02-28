/**
 * MeridianLink API Client
 *
 * Wraps MeridianLink Generic Framework services with OAuth 2.0 authentication.
 *
 * Authentication flow (from official docs):
 *   POST https://playrunner.mortgage.meridianlink.com/oauth/token
 *   Body: { client_id, client_secret }
 *   Returns: { access_token, token_type: "Bearer", expires_in: 14400 }
 *
 * The access_token is passed as sTicket in service calls: "Bearer {token}"
 *
 * Generic Framework base URL (sandbox):
 *   https://playrunner.mortgage.meridianlink.com/los/webservice/
 *
 * XML Namespace: http://www.lendersoffice.com/los/webservices/
 */

const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const config = require('../config');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
});

const WS_PATH = '/los/webservice';
const NAMESPACE = 'http://www.lendersoffice.com/los/webservices/';

class MeridianLinkClient {
  constructor() {
    this.clientId = config.meridianlink.clientId;
    this.clientSecret = config.meridianlink.clientSecret;
    this.oauthUrl = config.meridianlink.oauthUrl;
    this.baseDomain = config.meridianlink.baseDomain;

    // Legacy fallback
    this.username = config.meridianlink.username;
    this.password = config.meridianlink.password;

    this.accessToken = null;
    this.tokenExpiry = null;

    // Generic Framework ticket override
    // When MeridianLink launches us via the Generic Framework, it provides
    // an EncryptedTicket that replaces OAuth for EDocsService calls.
    this.ticketOverride = null;
  }

  /**
   * Set a Generic Framework EncryptedTicket to use instead of OAuth.
   * The ticket XML is passed directly as sTicket in SOAP calls.
   */
  setTicketOverride(ticketXml) {
    this.ticketOverride = ticketXml;
    console.log('[MeridianLink] Using Generic Framework EncryptedTicket (30 min validity)');
  }

  /** Clear the ticket override, reverting to OAuth */
  clearTicketOverride() {
    this.ticketOverride = null;
    console.log('[MeridianLink] Cleared ticket override, reverting to OAuth');
  }

  // ────────────────────────────────────────────
  //  Authentication (OAuth 2.0)
  // ────────────────────────────────────────────

  /**
   * Obtain an OAuth access token from MeridianLink.
   * Skipped when using a Generic Framework EncryptedTicket.
   */
  async authenticate() {
    // If we have a ticket override, skip OAuth entirely
    if (this.ticketOverride) {
      console.log('[MeridianLink] Using Generic Framework ticket (OAuth skipped)');
      return { success: true, tokenType: 'GenericFrameworkTicket', expiresIn: 1800 };
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'Missing ML_CLIENT_ID or ML_CLIENT_SECRET. ' +
        'Generate these from the MeridianLink Vendor Portal. ' +
        'See the API Access Administration guide for setup steps.'
      );
    }

    console.log('[MeridianLink] Requesting OAuth token...');

    const response = await axios.post(
      this.oauthUrl,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      }
    );

    const { access_token, token_type, expires_in } = response.data;

    if (!access_token) {
      console.error('[MeridianLink] OAuth response:', JSON.stringify(response.data, null, 2));
      throw new Error('OAuth authentication failed — no access_token returned');
    }

    this.accessToken = access_token;
    this.tokenExpiry = Date.now() + (expires_in - 300) * 1000;

    console.log(`[MeridianLink] OAuth token obtained (expires in ${expires_in}s)`);
    return { success: true, tokenType: token_type, expiresIn: expires_in };
  }

  /**
   * Get a valid sTicket for service calls.
   *
   * If a Generic Framework EncryptedTicket is set, the ticket XML is
   * returned directly (MeridianLink expects the full XML element).
   * Otherwise, returns "Bearer {access_token}" from OAuth.
   */
  async ensureAuth() {
    if (this.ticketOverride) {
      return this.ticketOverride;
    }
    if (!this.accessToken || Date.now() > this.tokenExpiry) {
      await this.authenticate();
    }
    return `Bearer ${this.accessToken}`;
  }

  // ────────────────────────────────────────────
  //  Document Operations (EDocsService)
  // ────────────────────────────────────────────

  async listDocuments(loanNumber) {
    const sTicket = await this.ensureAuth();

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:los="${NAMESPACE}">
  <soap:Body>
    <los:ListEdocsByLoanNumber>
      <los:sTicket>${this._escapeXml(sTicket)}</los:sTicket>
      <los:sLNm>${this._escapeXml(loanNumber)}</los:sLNm>
    </los:ListEdocsByLoanNumber>
  </soap:Body>
</soap:Envelope>`;

    console.log(`[MeridianLink] Listing eDocs for loan ${loanNumber}...`);

    const response = await axios.post(
      `${this.baseDomain}${WS_PATH}/EDocsService.asmx`,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: `"${NAMESPACE}ListEdocsByLoanNumber"`,
        },
        timeout: 15000,
      }
    );

    const parsed = xmlParser.parse(response.data);
    const body = parsed?.Envelope?.Body;
    const result =
      body?.ListEdocsByLoanNumberResponse?.ListEdocsByLoanNumberResult;

    return this._parseDocumentList(result);
  }

  async downloadDocument(docId) {
    const sTicket = await this.ensureAuth();

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:los="${NAMESPACE}">
  <soap:Body>
    <los:DownloadEdocsPdfById>
      <los:sTicket>${this._escapeXml(sTicket)}</los:sTicket>
      <los:docId>${this._escapeXml(docId)}</los:docId>
    </los:DownloadEdocsPdfById>
  </soap:Body>
</soap:Envelope>`;

    console.log(`[MeridianLink] Downloading document ${docId}...`);

    const response = await axios.post(
      `${this.baseDomain}${WS_PATH}/EDocsService.asmx`,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: `"${NAMESPACE}DownloadEdocsPdfById"`,
        },
        timeout: 30000,
      }
    );

    const parsed = xmlParser.parse(response.data);
    const body = parsed?.Envelope?.Body;
    const base64 =
      body?.DownloadEdocsPdfByIdResponse?.DownloadEdocsPdfByIdResult;

    return {
      guid: docId,
      content: base64 || '',
      format: 'pdf',
    };
  }

  async uploadDocument(loanNumber, documentType, base64Content, notes = '') {
    const sTicket = await this.ensureAuth();

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:los="${NAMESPACE}">
  <soap:Body>
    <los:UploadPDFDocument>
      <los:sTicket>${this._escapeXml(sTicket)}</los:sTicket>
      <los:sLNm>${this._escapeXml(loanNumber)}</los:sLNm>
      <los:documentType>${this._escapeXml(documentType)}</los:documentType>
      <los:notes>${this._escapeXml(notes)}</los:notes>
      <los:sDataContent>${base64Content}</los:sDataContent>
    </los:UploadPDFDocument>
  </soap:Body>
</soap:Envelope>`;

    console.log(`[MeridianLink] Uploading "${documentType}" to loan ${loanNumber}...`);

    const response = await axios.post(
      `${this.baseDomain}${WS_PATH}/EDocsService.asmx`,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: `"${NAMESPACE}UploadPDFDocument"`,
        },
        timeout: 30000,
      }
    );

    const parsed = xmlParser.parse(response.data);
    const body = parsed?.Envelope?.Body;
    const result =
      body?.UploadPDFDocumentResponse?.UploadPDFDocumentResult;

    console.log(`[MeridianLink] Upload result: ${JSON.stringify(result)}`);

    return {
      success: true,
      loanNumber,
      documentType,
      result: result || 'uploaded',
    };
  }

  // ────────────────────────────────────────────
  //  Helpers
  // ────────────────────────────────────────────

  _parseDocumentList(raw) {
    if (!raw) return [];
    try {
      let innerParsed = raw;
      if (typeof raw === 'string') {
        innerParsed = xmlParser.parse(raw);
      }

      const docs =
        innerParsed?.EDocs?.EDoc ||
        innerParsed?.edocs?.edoc ||
        innerParsed?.DocumentList?.Document ||
        innerParsed;

      if (!docs) return [];

      const list = Array.isArray(docs) ? docs : [docs];
      return list.map((d) => ({
        guid: d.docid || d.GUID || d['@_docid'] || d['@_GUID'] || d.guid || '',
        name: d.Name || d.DocumentName || d.name || d.doc_type || '',
        type: d.Type || d.DocumentType || d.doc_type || d.type || '',
        folder: d.folder_name || d.Folder || '',
        dateModified: d.DateModified || d.date_modified || '',
        size: d.Size || d.size || 0,
      }));
    } catch (err) {
      console.error('[MeridianLink] Error parsing document list:', err.message);
      return [];
    }
  }

  _escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = MeridianLinkClient;
