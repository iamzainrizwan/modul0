// small dom helpers for the admin; text always goes in as textContent
export function say(text: string, err = false) {
  const live = document.querySelector<HTMLElement>('[data-live]')!;
  live.textContent = text;
  live.classList.toggle('adm-err', err);
}

type Props = { class?: string; text?: string; [attr: string]: string | boolean | undefined };
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...kids: (Node | string)[]) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  node.append(...kids);
  return node;
}

export function button(text: string, onClick: () => void, cls = 'text-btn') {
  const b = el('button', { type: 'button', class: cls, text });
  b.addEventListener('click', onClick);
  return b;
}

export const fmt = (n: number) => n.toLocaleString('en-GB');
export const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;
export const when = (iso: string) => iso.replace('T', ' ').slice(0, 16);

// anything with unsaved changes registers here, so leaving the page asks first
const dirty = new Set<() => boolean>();
export const watchDirty = (fn: () => boolean) => dirty.add(fn);
window.addEventListener('beforeunload', (e) => {
  if ([...dirty].some((fn) => fn())) e.preventDefault();
});
