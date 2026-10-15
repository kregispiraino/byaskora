export const GOOGLE_ADS_ID = 'AW-18509101979';
export const CONSENT_KEY = 'byaskora.ads-consent.v1';
export const googleAdsConversions = Object.freeze({
  websites: 'AW-18509101979/o_xZCJTFrZ4dEJv36flE',
  aplicativos: 'AW-18509101979/OJNrCJfFrZ4dEJv36flE',
  sistemas: 'AW-18509101979/-LYLCJrFrZ4dEJv36flE',
  aiSolutions: 'AW-18509101979/OIzpCJ3FrZ4dEJv36flE',
  reestruturacao: 'AW-18509101979/7jDQCNTGrZ4dEJv36flE',
});
const serviceRoutes = Object.freeze({
  '/websites': 'websites',
  '/aplicativos': 'aplicativos',
  '/sistemas': 'sistemas',
  '/ai-solutions': 'aiSolutions',
  '/reestruturacao': 'reestruturacao',
});
export function serviceFromPath(pathname) {
  const path = pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
  return Object.hasOwn(serviceRoutes, path) ? serviceRoutes[path] : null;
}

let initialized = false;
let consent = null;
let configured = false;
function readConsent() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return ['granted', 'denied'].includes(value) ? value : null;
  } catch {
    return null;
  }
}
function consentSettings(value) {
  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  };
}
function loadGoogleTag() {
  if (configured) return;
  configured = true;
  // Preserve any existing queue/tag and configure this destination only once.
  if (!window.dataLayer.some((entry) => entry[0] === 'js'))
    window.gtag('js', new Date());
  if (
    !window.dataLayer.some(
      (entry) => entry[0] === 'config' && entry[1] === GOOGLE_ADS_ID,
    )
  )
    window.gtag('config', GOOGLE_ADS_ID, {
      send_page_view: false,
      allow_ad_personalization_signals: false,
    });
  const installed = [...document.scripts].some((script) =>
    script.src.startsWith('https://www.googletagmanager.com/gtag/js'),
  );
  if (!installed) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    document.head.append(script);
  }
}
function renderConsent() {
  const notice = document.querySelector('[data-cookie-notice]');
  if (notice) notice.hidden = consent !== null;
  document.body.classList.toggle('cookie-choice-pending', consent === null);
  document.querySelectorAll('[data-cookie-status]').forEach((status) => {
    status.textContent =
      consent === 'granted'
        ? 'Medição de anúncios permitida.'
        : 'Medição de anúncios desativada.';
  });
}
function updateConsent(value) {
  consent = value;
  window.gtag('consent', 'update', consentSettings(value || 'denied'));
  if (value === 'granted') loadGoogleTag();
  renderConsent();
}
export function initAnalytics() {
  if (initialized) return;
  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };
  window.gtag('consent', 'default', consentSettings('denied'));
  window.gtag('set', 'ads_data_redaction', true);
  updateConsent(readConsent());
  const notice = document.querySelector('[data-cookie-notice]');
  if (notice)
    new ResizeObserver(() => {
      if (!notice.hidden)
        document.body.style.setProperty(
          '--cookie-notice-space',
          `${notice.offsetHeight + 32}px`,
        );
    }).observe(notice);
  document.querySelectorAll('[data-cookie-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.cookieChoice;
      try {
        localStorage.setItem(CONSENT_KEY, value);
      } catch {
        /* Session-only choice if storage is unavailable. */
      }
      updateConsent(value);
    });
  });
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null)
      updateConsent(readConsent());
  });
}
export function trackWhatsAppConversion(context) {
  if (
    consent !== 'granted' ||
    !context?.service ||
    !Object.hasOwn(googleAdsConversions, context.service)
  )
    return;
  // Tracking must never cancel or delay the native WhatsApp link navigation.
  try {
    window.gtag('event', 'conversion', {
      send_to: googleAdsConversions[context.service],
    });
  } catch {
    /* WhatsApp remains available if a tag is blocked or fails. */
  }
}
