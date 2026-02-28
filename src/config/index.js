/**
 * Application Configuration
 *
 * Loads environment variables and exports a structured config object.
 * All MeridianLink credentials and app settings are centralized here.
 */

const path = require('path');
const fs = require('fs');

// Try multiple .env locations (works both locally and on Vercel)
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config(); // fallback: use process.env directly (Vercel sets env vars)
}

const config = {
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    useMock: process.env.USE_MOCK !== 'false', // default to true (mock mode) unless explicitly set to 'false'
    vendorName: process.env.VENDOR_NAME || 'Ocrolus',
    publicUrl: process.env.PUBLIC_URL || '',
  },

  meridianlink: {
    clientId: process.env.ML_CLIENT_ID || '',
    clientSecret: process.env.ML_CLIENT_SECRET || '',
    oauthUrl: process.env.ML_OAUTH_URL || 'https://playrunner.mortgage.meridianlink.com/oauth/token',
    baseDomain: process.env.ML_BASE_DOMAIN || 'https://playrunner.mortgage.meridianlink.com',
    username: process.env.ML_USERNAME || '',
    password: process.env.ML_PASSWORD || '',
    apiKey: process.env.ML_API_KEY || '',
  },

  processing: {
    delayMs: parseInt(process.env.PROCESSING_DELAY_MS, 10) || 2000,
  },
};

module.exports = config;
