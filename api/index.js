/**
 * Vercel Serverless Entry Point
 *
 * Wraps the Express app for Vercel's serverless functions.
 * Vercel calls this handler for every request, instead of app.listen().
 */

const app = require('../src/app');

module.exports = app;
