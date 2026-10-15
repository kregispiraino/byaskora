import { createHash } from 'node:crypto';
import { loadSite, readSource } from './site.js';

// Only the exact pre-paint bootstrap is allowed inline; all other code is local.
const bootstrapHash = createHash('sha256')
  .update(readSource('src/js/bootstrap.js'))
  .digest('base64');
// Styles allow existing inline chart dimensions and canvas positioning.
export const securityHeaders = {
  'Content-Security-Policy': `default-src 'self'; script-src 'self' 'sha256-${bootstrapHash}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${loadSite().contactEndpoint}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'`,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
};
