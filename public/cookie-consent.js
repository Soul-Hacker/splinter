(() => {
  'use strict';

  const STORAGE_KEY = 'splinter-cookie-consent';
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;

  const showBanner = () => { banner.hidden = false; };
  const manage = document.getElementById('cookieManage');
  if (manage) manage.addEventListener('click', showBanner);

  const choice = window.localStorage.getItem(STORAGE_KEY);
  if (choice === 'accepted' || choice === 'rejected') return;

  showBanner();
  document.getElementById('cookieAccept').addEventListener('click', () => {
    window.localStorage.setItem(STORAGE_KEY, 'accepted');
    banner.hidden = true;
    window.dispatchEvent(new CustomEvent('splinter-consent', { detail: { accepted: true } }));
  });
  document.getElementById('cookieReject').addEventListener('click', () => {
    window.localStorage.setItem(STORAGE_KEY, 'rejected');
    banner.hidden = true;
    window.dispatchEvent(new CustomEvent('splinter-consent', { detail: { accepted: false } }));
  });
})();
