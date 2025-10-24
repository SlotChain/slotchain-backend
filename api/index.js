// Hook into the compiled NestJS serverless handler for Vercel.
const handler = require('../dist/main').default;

module.exports = handler;
