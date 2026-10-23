// the admin dashboard: log in, then one panel at a time by the url hash
// (#posts, #posts/new, #posts/slug, #content/projects...)
import { setup, hasToken, login, logout, call, explain } from './api';
import { say } from './ui';
import { loadOverview } from './overview';
import { loadPosts, routePosts } from './posts';
import { loadContent, routeContent } from './content';
import { loadGuestbook } from './guestbook';
import { loadWall } from './wall';
import { loadStats } from './stats';

let ready = false;

function route() {
  const [first, ...rest] = location.hash.slice(1).split('/');
  const panel = first || 'overview';
  const sub = rest.join('/');
  document.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => (p.hidden = !ready || p.dataset.panel !== panel));
  document.querySelectorAll<HTMLAnchorElement>('.adm-nav a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href')!.slice(1);
    const current = href === panel || href === `${panel}/${sub}`;
    if (current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (!ready) return;
  if (panel === 'posts') routePosts(sub);
  if (panel === 'content') routeContent(sub || 'profile');
}

async function open() {
  try {
    // a cheap admin call to check the token before showing anything
    await call('/admin/wall');
  } catch (e) {
    ready = false;
    route();
    return say(explain(e), true);
  }
  ready = true;
  document.body.classList.add('adm-in');
  document.querySelector<HTMLElement>('[data-logout]')!.hidden = false;
  say('');
  route();
  // each panel loads on its own; one failing doesn't stop the rest
  const all = [loadPosts(), loadContent(), loadGuestbook(), loadWall(), loadStats()];
  await Promise.allSettled(all);
  loadOverview();
  route();
}

export function start() {
  const form = document.querySelector<HTMLFormElement>('[data-login]')!;
  const api = form.dataset.api;
  if (!api) return;
  setup(api);
  const input = form.querySelector<HTMLInputElement>('input[name=token]')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    login(input.value.trim());
    input.value = '';
    open();
  });
  form.querySelector('[data-logout]')!.addEventListener('click', () => {
    logout();
    location.hash = '';
    location.reload();
  });
  window.addEventListener('hashchange', route);
  if (hasToken()) open();
  else route();
}
