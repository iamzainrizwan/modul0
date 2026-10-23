import { api } from '../data/api';

// one page load for the admin stats (/admin/): the path and, on the first
// page only, the referrer. noindex pages (the admin itself) aren't counted,
// and neither is anyone who asks not to be tracked. run it straight away and
// on astro:page-load: the marker on the (swapped-in) body counts each page once.
let first = true;
export function logHit() {
  if (document.body.dataset.hit) return;
  document.body.dataset.hit = '1';
  const ref = first ? document.referrer : '';
  first = false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (!api || nav.globalPrivacyControl || nav.doNotTrack === '1') return;
  if (document.querySelector('meta[name=robots][content~=noindex]')) return;
  fetch(`${api}/hit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: location.pathname, ref }),
    keepalive: true,
  }).catch(() => {});
}
