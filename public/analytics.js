(() => {
  'use strict';

  const MEASUREMENT_ID = 'G-6G16BK3GC0';
  const CONSENT_KEY = 'splinter-cookie-consent';
  let loaded = false;

  function loadAnalytics() {
    if (loaded) return;
    loaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    document.head.appendChild(script);
  }

  window.splinterTrack = (name, params) => {
    if (loaded && typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  if (window.localStorage.getItem(CONSENT_KEY) === 'accepted') loadAnalytics();
  window.addEventListener('splinter-consent', (event) => {
    if (event.detail && event.detail.accepted) loadAnalytics();
    if (loaded && event.detail && !event.detail.accepted) {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
  });
})();