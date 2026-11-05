/*
 * Plausible analytics loader (cookieless, no personal data). Same-origin so the
 * CSP needs no 'unsafe-inline'. Loaded with defer before the app bundle, so the
 * queue stub below exists before any track() call; events queue until the
 * Plausible script arrives. It only runs on the production hostnames (not in
 * development, the compose stack or the e2e runs) and never on the staff / HR
 * back office, which the same SPA serves.
 */
(function () {
  var HOSTS = ['web-production-ff60b.up.railway.app', 'vallepark.com', 'www.vallepark.com'];
  var BACK_OFFICE = /^\/(?:[a-z]{2}\/)?(?:staff|hr)(?:\/|$)/;
  var path = function (url) { try { return new URL(url, location.href).pathname; } catch (e) { return location.pathname; } };
  if (HOSTS.indexOf(location.hostname) < 0 || BACK_OFFICE.test(location.pathname)) return;
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://plausible.io/js/pa-O4JAEblRApCaH--1I2mFs.js';
  document.head.appendChild(s);
  window.plausible = window.plausible || function () { (plausible.q = plausible.q || []).push(arguments); };
  plausible.init = plausible.init || function (i) { plausible.o = i || {}; };
  // pageviews follow React Router's pushState on their own; a client-side visit to the back office is dropped
  plausible.init({ transformRequest: function (p) { return BACK_OFFICE.test(path(p.u)) ? null : p; } });
})();
