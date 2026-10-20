/*
  Gestión del consentimiento de cookies de IOTLABS.

  - Google Analytics y Microsoft Clarity NO se cargan hasta que el visitante acepta
    las cookies de analítica.
  - La elección se guarda en localStorage (almacenamiento técnico, exento de
    consentimiento) durante 12 meses; después se vuelve a preguntar.
  - Si el visitante retira el consentimiento, se borran las cookies de analítica
    del dominio y se recarga la página para detener los scripts.
  - Textos en español o inglés según <html lang>.
  - Cualquier elemento con [data-cookie-settings] abre el panel de configuración.

  Se carga en el <head> de todas las páginas, antes de cualquier llamada a gtag().
*/
(function () {
  'use strict';

  var GA_ID = 'G-ZE6RT5579J';
  var CLARITY_ID = 'yugp8e0gnd';
  var KEY = 'iotlabs_consent_v1';
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 12 meses

  var lang = (document.documentElement.lang || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  var POLICY_URL = lang === 'en' ? 'privacy.html#cookies' : 'privacidad.html#cookies';

  var T = {
    es: {
      title: 'Tu privacidad',
      text: 'Usamos almacenamiento técnico para que la web funcione y, solo si lo aceptas, cookies de analítica de Google Analytics y Microsoft Clarity para entender cómo se usa la web y mejorarla.',
      more: 'Política de privacidad y cookies',
      reject: 'Rechazar',
      accept: 'Aceptar',
      techTitle: 'Técnicas',
      techText: 'Necesarias para que la web funcione y para recordar tu elección.',
      always: 'Siempre activas',
      anTitle: 'Analítica',
      anText: 'Google Analytics (estadísticas de visitas) y Microsoft Clarity (mapas de calor y grabación de la navegación: clics, scroll y movimientos, con el contenido sensible enmascarado).',
      rejectAll: 'Rechazar todo',
      save: 'Guardar preferencias',
      acceptAll: 'Aceptar todo',
      dialog: 'Preferencias de cookies'
    },
    en: {
      title: 'Your privacy',
      text: 'We use technical storage to make the site work and, only if you accept, analytics cookies from Google Analytics and Microsoft Clarity to understand how the site is used and improve it.',
      more: 'Privacy and cookie policy',
      reject: 'Reject',
      accept: 'Accept',
      techTitle: 'Technical',
      techText: 'Required for the site to work and to remember your choice.',
      always: 'Always on',
      anTitle: 'Analytics',
      anText: 'Google Analytics (visit statistics) and Microsoft Clarity (heatmaps and session recording: clicks, scrolling and movements, with sensitive content masked).',
      rejectAll: 'Reject all',
      save: 'Save preferences',
      acceptAll: 'Accept all',
      dialog: 'Cookie preferences'
    }
  }[lang];

  // ── Estado ──
  function read() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s.analytics === 'boolean' && Date.now() - s.ts < MAX_AGE) return s;
    } catch (e) {}
    return null;
  }

  function write(analytics) {
    var s = { analytics: !!analytics, ts: Date.now(), v: 1 };
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }

  var state = read();

  // gtag() existe siempre para que los onclick de la página no fallen,
  // pero solo envía datos cuando la analítica está aceptada y cargada.
  window.dataLayer = window.dataLayer || [];
  var analyticsOn = false;
  window.gtag = function () { if (analyticsOn) window.dataLayer.push(arguments); };

  function loadAnalytics() {
    if (analyticsOn) return;
    analyticsOn = true;

    // Google Analytics 4 (Consent Mode v2: analítica concedida, publicidad denegada)
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    gtag('js', new Date());
    gtag('config', GA_ID);
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(g);

    // Microsoft Clarity
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  }

  function clearAnalyticsCookies() {
    var host = location.hostname;
    var parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^(_ga|_gid|_gat|_clck|_clsk)/.test(name)) {
        domains.forEach(function (d) {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  function apply(analytics) {
    var wasOn = analyticsOn;
    state = write(analytics);
    if (analytics) {
      loadAnalytics();
    } else if (wasOn) {
      try { window.clarity && window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }); } catch (e) {}
      clearAnalyticsCookies();
      location.reload();
      return;
    } else {
      clearAnalyticsCookies();
    }
    hideBanner();
  }

  if (state && state.analytics) loadAnalytics();

  // ── Interfaz ──
  var css = '' +
    '.ck{position:fixed;z-index:900;left:1.25rem;bottom:1.25rem;width:min(560px,calc(100vw - 2.5rem));' +
      'background:rgba(9,22,40,.92);border:1px solid rgba(140,190,255,.16);border-radius:16px;padding:1.3rem 1.4rem;' +
      'backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);' +
      'box-shadow:0 24px 60px -20px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.06);color:#f0f6ff;' +
      'font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:.88rem;line-height:1.6;' +
      'opacity:0;transform:translateY(16px);transition:opacity .35s,transform .45s cubic-bezier(.22,1,.36,1)}' +
    '.ck.show{opacity:1;transform:none}' +
    '.ck h2{font-family:Rajdhani,sans-serif;font-weight:700;font-size:1.15rem;letter-spacing:.06em;text-transform:uppercase;margin:0 0 .4rem}' +
    '.ck p{margin:0;color:#c8dff7;font-weight:300}' +
    '.ck a{color:#00d4ff}' +
    '.ck-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.1rem}' +
    '.ck button{font:600 .82rem Rajdhani,sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;' +
      'border-radius:8px;padding:.7rem 1.1rem;border:1px solid rgba(0,212,255,.5);background:rgba(13,34,64,.6);color:#f0f6ff;' +
      'transition:background .2s,color .2s,border-color .2s}' +
    '.ck button:hover{background:rgba(0,212,255,.14);color:#00d4ff}' +
    '.ck button.ck-main{background:#0a84ff;border-color:#0a84ff;color:#fff}' +
    '.ck button.ck-main:hover{background:#00d4ff;border-color:#00d4ff;color:#050d1a}' +
    '.ck button:focus-visible{outline:2px solid #00d4ff;outline-offset:2px}' +
    '.ck-actions .ck-grow{flex:1 1 auto}' +
    '.ck-panel{display:none;margin-top:1rem;border-top:1px solid rgba(140,190,255,.12);padding-top:.4rem}' +
    '.ck.open .ck-panel{display:block}' +
    '.ck-row{display:flex;gap:1rem;align-items:flex-start;justify-content:space-between;padding:.8rem 0;border-bottom:1px solid rgba(140,190,255,.08)}' +
    '.ck-row strong{display:block;font-family:Rajdhani,sans-serif;font-size:1rem;letter-spacing:.05em;text-transform:uppercase}' +
    '.ck-row span{color:#7d97b8;font-size:.8rem;line-height:1.5;display:block}' +
    '.ck-always{font-family:"IBM Plex Mono",monospace;font-size:.62rem !important;letter-spacing:.08em;text-transform:uppercase;color:#2bff9e !important;white-space:nowrap;margin-top:.2rem}' +
    '.ck-sw{position:relative;flex-shrink:0;width:44px;height:24px;margin-top:.15rem}' +
    '.ck-sw input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}' +
    '.ck-sw i{position:absolute;inset:0;border-radius:999px;background:#1c3352;border:1px solid rgba(140,190,255,.2);transition:background .2s}' +
    '.ck-sw i::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#c8dff7;transition:transform .25s cubic-bezier(.22,1,.36,1)}' +
    '.ck-sw input:checked+i{background:#0a84ff;border-color:#0a84ff}' +
    '.ck-sw input:checked+i::after{transform:translateX(20px);background:#fff}' +
    '.ck-sw input:focus-visible+i{outline:2px solid #00d4ff;outline-offset:2px}' +
    '@media (max-width:520px){.ck{left:.75rem;right:.75rem;bottom:.75rem;width:auto;padding:1.1rem}' +
      '.ck-actions .ck-grow{display:none}.ck-actions .ck-main{flex:1 1 40%;order:1}' +
      '.ck-actions .ck-alt{flex:1 1 100%;order:2}}' +
    '@media (prefers-reduced-motion:reduce){.ck{transition:none}}';

  var root = null;

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function build() {
    if (root) return root;
    document.head.appendChild(el('style', {}, css));
    root = el('div', { 'class': 'ck', role: 'dialog', 'aria-live': 'polite', 'aria-label': T.dialog });
    root.innerHTML =
      '<h2>' + T.title + '</h2>' +
      '<p>' + T.text + ' <a href="' + POLICY_URL + '">' + T.more + '</a>.</p>' +
      '<div class="ck-panel" id="ck-panel">' +
        '<div class="ck-row"><div><strong>' + T.techTitle + '</strong><span>' + T.techText + '</span></div>' +
          '<span class="ck-always">' + T.always + '</span></div>' +
        '<div class="ck-row"><div><strong>' + T.anTitle + '</strong><span>' + T.anText + '</span></div>' +
          '<label class="ck-sw"><input type="checkbox" id="ck-an" aria-label="' + T.anTitle + '"><i></i></label></div>' +
      '</div>' +
      '<div class="ck-actions" id="ck-actions"></div>';
    document.body.appendChild(root);
    return root;
  }

  function setButtons(mode) {
    var a = root.querySelector('#ck-actions');
    if (mode === 'settings') {
      a.innerHTML =
        '<button type="button" class="ck-alt" data-ck="save">' + T.save + '</button>' +
        '<span class="ck-grow"></span>' +
        '<button type="button" class="ck-main" data-ck="reject">' + T.rejectAll + '</button>' +
        '<button type="button" class="ck-main" data-ck="accept">' + T.acceptAll + '</button>';
    } else {
      // Primera capa: solo Rechazar y Aceptar (una única finalidad: analítica).
      // El panel de configuración se abre desde el enlace "Configurar cookies" del pie.
      a.innerHTML =
        '<span class="ck-grow"></span>' +
        '<button type="button" class="ck-main" data-ck="reject">' + T.reject + '</button>' +
        '<button type="button" class="ck-main" data-ck="accept">' + T.accept + '</button>';
    }
    a.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-ck');
        if (act === 'accept') apply(true);
        else if (act === 'reject') apply(false);
        else if (act === 'save') apply(root.querySelector('#ck-an').checked);
      });
    });
  }

  function showBanner(settings) {
    build();
    root.querySelector('#ck-an').checked = !!(state && state.analytics);
    root.classList.toggle('open', !!settings);
    setButtons(settings ? 'settings' : 'banner');
    root.style.display = '';
    requestAnimationFrame(function () { root.classList.add('show'); });
    if (settings) root.querySelector('#ck-an').focus();
  }

  function openSettings() { showBanner(true); }

  function hideBanner() {
    if (!root) return;
    root.classList.remove('show');
    setTimeout(function () { if (!root.classList.contains('show')) root.style.display = 'none'; }, 400);
  }

  window.iotConsent = { open: openSettings, get: function () { return state; } };

  function init() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (t) { e.preventDefault(); openSettings(); }
    });
    if (!state) showBanner(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
