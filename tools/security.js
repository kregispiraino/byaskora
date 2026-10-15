import { createHash } from 'node:crypto';
import { loadSite, readSource } from './site.js';

// Only the exact pre-paint bootstrap is allowed inline. Google Ads loads after consent.
const bootstrapHash = createHash('sha256')
  .update(readSource('src/js/bootstrap.js'))
  .digest('base64');
// Google Ads endpoints: https://developers.google.com/tag-platform/security/guides/csp
const adsScripts =
  'https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com';
const adsImages = `${adsScripts} https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com.br`;
// Styles allow existing inline chart dimensions and canvas positioning.
export const securityHeaders = {
  'Content-Security-Policy': `default-src 'self'; script-src 'self' 'sha256-${bootstrapHash}' ${adsScripts}; style-src 'self' 'unsafe-inline'; img-src 'self' data: ${adsImages}; font-src 'self'; connect-src 'self' ${loadSite().contactEndpoint} ${adsImages} https://ad.doubleclick.net; frame-src https://www.googletagmanager.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'`,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
};
