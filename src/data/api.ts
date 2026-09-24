// the guestbook + view counter api (api/, a cloudflare worker). set PUBLIC_API
// at build time to its url; without it the guestbook says it's offline and
// the counter stays hidden.
export const api: string = (import.meta.env.PUBLIC_API ?? '').replace(/\/$/, '');
