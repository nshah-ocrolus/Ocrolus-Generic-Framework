/**
 * Application Configuration
 *
 * Loads environment variables and exports a structured config object.
 * All MeridianLink credentials and app settings are centralized here.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    useMock: process.env.USE_MOCK === 'true',
  },

  meridianlink: {
    // OAuth credentials (required for live API)
    clientId: process.env.ML_CLIENT_ID || '',
    clientSecret: process.env.ML_CLIENT_SECRET || '',
    oauthUrl: process.env.ML_OAUTH_URL || 'https://playrunner.mortgage.meridianlink.com/oauth/token',

    // Generic Framework base domain (single unified endpoint)
    baseDomain: process.env.ML_BASE_DOMAIN || 'https://playrunner.mortgage.meridianlink.com',

    // Legacy credentials (kept for reference / fallback)
    username: process.env.ML_USERNAME || '',
    password: process.env.ML_PASSWORD || '',
    apiKey: process.env.ML_API_KEY || '',
  },

  processing: {
    delayMs: parseInt(process.env.PROCESSING_DELAY_MS, 10) || 2000,
  },
};

module.exports = config;
