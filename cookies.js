(function () {
  'use strict';

  var STORAGE_KEY = 'nt_cookie_consent_v1';

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setConsent(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        necessary: true,
        functional: !!state.functional,
        analytics: !!state.analytics,
        marketing: !!state.marketing,
        timestamp: new Date().toISOString(),
        version: 1
      }));
    } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById('nt-cookie-style')) return;
    var s = document.createElement('style');
    s.id = 'nt-cookie-style';
    s.textContent = [
      '#nt-cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.18);padding:20px 22px;z-index:99999;font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:.95rem;line-height:1.5;animation:ntcookieIn .35s ease}',
      '@media(max-width:768px){#nt-cookie-banner{bottom:80px;left:12px;right:12px;padding:18px 18px}}',
      '@keyframes ntcookieIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}',
      '#nt-cookie-banner h3{margin:0 0 8px;font-size:1.05rem;font-weight:700;color:#0f172a}',
      '#nt-cookie-banner p{margin:0 0 14px;color:#334155}',
      '#nt-cookie-banner a{color:#F47920;text-decoration:underline}',
      '#nt-cookie-banner .nt-btns{display:flex;gap:8px;flex-wrap:wrap}',
      '#nt-cookie-banner button{appearance:none;border:0;cursor:pointer;font-family:inherit;font-weight:600;font-size:.88rem;padding:10px 16px;border-radius:8px;transition:all .15s}',
      '#nt-cookie-banner .nt-accept{background:#F47920;color:#fff}',
      '#nt-cookie-banner .nt-accept:hover{background:#E5660D}',
      '#nt-cookie-banner .nt-reject{background:#f1f5f9;color:#0f172a}',
      '#nt-cookie-banner .nt-reject:hover{background:#e2e8f0}',
      '#nt-cookie-banner .nt-settings{background:transparent;color:#475569;text-decoration:underline;padding:10px 8px}',
      '#nt-cookie-banner .nt-cats{display:none;margin:14px 0 6px;border-top:1px solid #e2e8f0;padding-top:14px}',
      '#nt-cookie-banner .nt-cats.show{display:block}',
      '#nt-cookie-banner .nt-cat{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px}',
      '#nt-cookie-banner .nt-cat input[type=checkbox]{margin-top:3px;cursor:pointer}',
      '#nt-cookie-banner .nt-cat input[type=checkbox]:disabled{opacity:.5;cursor:not-allowed}',
      '#nt-cookie-banner .nt-cat label{cursor:pointer;font-size:.86rem}',
      '#nt-cookie-banner .nt-cat label strong{display:block;color:#0f172a}',
      '#nt-cookie-banner .nt-cat label span{color:#64748b;font-size:.8rem;display:block;margin-top:2px}',
      '#nt-cookie-reopen{position:fixed;left:16px;bottom:16px;background:#fff;border:1px solid #e2e8f0;border-radius:50%;width:42px;height:42px;display:none;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:99998;font-size:18px}',
      '@media(max-width:768px){#nt-cookie-reopen{bottom:80px}}',
      '#nt-cookie-reopen.show{display:flex}'
    ].join('');
    document.head.appendChild(s);
  }

  function buildBanner() {
    var b = document.createElement('div');
    b.id = 'nt-cookie-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Cookie-samtykke');
    b.innerHTML = [
      '<h3>Vi bruger cookies</h3>',
      '<p>Nordic Team bruger nødvendige cookies for at hjemmesiden virker. Vi indlæser også skrifttyper fra Google Fonts, hvilket sender din IP-adresse til Google. Vælg hvad du accepterer. Læs mere i vores <a href="privatlivspolitik.html">privatlivspolitik</a>.</p>',
      '<div class="nt-cats" id="nt-cats">',
      '  <div class="nt-cat"><input type="checkbox" id="nt-c-necessary" checked disabled><label for="nt-c-necessary"><strong>Nødvendige (altid aktive)</strong><span>Påkrævet for at hjemmesiden fungerer — fx kontaktformular og navigation.</span></label></div>',
      '  <div class="nt-cat"><input type="checkbox" id="nt-c-functional"><label for="nt-c-functional"><strong>Funktionelle</strong><span>Eksterne skrifttyper fra Google Fonts. Forbedrer udseendet, men sender din IP til Google.</span></label></div>',
      '</div>',
      '<div class="nt-btns">',
      '  <button class="nt-accept" id="nt-accept-all">Acceptér alle</button>',
      '  <button class="nt-reject" id="nt-reject-all">Afvis alle</button>',
      '  <button class="nt-settings" id="nt-toggle-settings">Tilpas</button>',
      '  <button class="nt-accept" id="nt-save-settings" style="display:none">Gem valg</button>',
      '</div>'
    ].join('');
    return b;
  }

  function buildReopen() {
    var r = document.createElement('button');
    r.id = 'nt-cookie-reopen';
    r.setAttribute('aria-label', 'Åbn cookie-indstillinger');
    r.innerHTML = '🍪';
    r.addEventListener('click', function () {
      r.classList.remove('show');
      show();
    });
    return r;
  }

  function applyConsent(consent) {
    if (consent && consent.functional) {
      loadGoogleFonts();
    }
  }

  function loadGoogleFonts() {
    if (document.getElementById('nt-gfonts')) return;
    var l = document.createElement('link');
    l.id = 'nt-gfonts';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(l);
  }

  function hide() {
    var b = document.getElementById('nt-cookie-banner');
    if (b) b.remove();
    var r = document.getElementById('nt-cookie-reopen');
    if (r) r.classList.add('show');
  }

  function show() {
    if (document.getElementById('nt-cookie-banner')) return;
    var banner = buildBanner();
    document.body.appendChild(banner);
    bindEvents(banner);
  }

  function bindEvents(banner) {
    document.getElementById('nt-accept-all').addEventListener('click', function () {
      var c = { functional: true, analytics: false, marketing: false };
      setConsent(c);
      applyConsent(c);
      hide();
    });
    document.getElementById('nt-reject-all').addEventListener('click', function () {
      var c = { functional: false, analytics: false, marketing: false };
      setConsent(c);
      hide();
    });
    document.getElementById('nt-toggle-settings').addEventListener('click', function () {
      var cats = document.getElementById('nt-cats');
      var save = document.getElementById('nt-save-settings');
      cats.classList.add('show');
      save.style.display = '';
      this.style.display = 'none';
    });
    document.getElementById('nt-save-settings').addEventListener('click', function () {
      var c = {
        functional: document.getElementById('nt-c-functional').checked,
        analytics: false,
        marketing: false
      };
      setConsent(c);
      applyConsent(c);
      hide();
    });
  }

  function init() {
    injectStyles();
    var reopen = buildReopen();
    document.body.appendChild(reopen);

    var consent = getConsent();
    if (consent) {
      applyConsent(consent);
      reopen.classList.add('show');
    } else {
      show();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
