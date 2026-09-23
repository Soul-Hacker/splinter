(() => {
  'use strict';

  const MEASUREMENT_ID = 'G-6G16BK3GC0';
  const CONSENT_KEY = 'splinter-cookie-consent';

  function updateConsent(accepted) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: accepted ? 'granted' : 'denied' });
    }
  }

  window.splinterTrack = (name, params) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  updateConsent(window.localStorage.getItem(CONSENT_KEY) === 'accepted');
  window.addEventListener('splinter-consent', (event) => {
    if (event.detail) updateConsent(event.detail.accepted);
  });
})();