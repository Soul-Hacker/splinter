(() => {
  'use strict';

  const STORAGE_KEY = 'splinter-cookie-consent';
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;

  const showBanner = () => { banner.hidden = false; };
  const manage = document.getElementById('cookieManage');
  if (manage) manage.addEventListener('click', showBanner);

  const choice = window.localStorage.getItem(STORAGE_KEY);
  const choose = (accepted) => {
    window.localStorage.setItem(STORAGE_KEY, accepted ? 'accepted' : 'rejected');
    banner.hidden = true;
    window.dispatchEvent(new CustomEvent('splinter-consent', { detail: { accepted } }));
  };
  document.getElementById('cookieAccept').addEventListener('click', () => {
    choose(true);
  });
  document.getElementById('cookieReject').addEventListener('click', () => {
    choose(false);
  });

  if (choice === 'accepted' || choice === 'rejected') return;

  showBanner();
})();
