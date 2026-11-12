# api/ (guestbook worker)

Setup, moderation, local dev and the abuse caps are in `README.md`. Root
CLAUDE.md has the rules that apply site-wide (secrets, schema re-runs).

- Wall: "replay" redraws it from `/wall/history` (3 base-32 chars a
  placement). The worker keeps the finished wall and the replay in one
  `wall_state` row, updated in the same statement as each placement and
  rebuilt after an admin undo/clear: reading the wall must stay one row,
  never a scan (D1 free tier; workers.dev can't edge-cache). Admin undoes a
  poster or clears it.
- Replies: Zain can reply to a message from the admin page (`replies`
  table, joined into `/messages`, shown under it as "↳ zain"); deleting a
  message deletes its reply.
