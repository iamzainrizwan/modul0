// guestbook moderation: delete a message, everything from one poster, or reply
import { renderMessages, type Message } from '../guestbook';
import { call, explain } from './api';
import { say, el, button } from './ui';

export let messages: Message[] = [];
const list = () => document.querySelector<HTMLOListElement>('[data-gb-list]')!;

// poster is a short tag of the salted ip hash: same tag, same sender
const show = () =>
  renderMessages(list(), messages, (m, li) => {
    const row = el('p', { class: 'gb-del' });
    const n = messages.filter((x) => x.poster === m.poster).length;
    row.append(button(`delete #${m.id}`, () => remove(m)), button(m.reply ? 'edit reply' : 'reply', () => answer(m)));
    if (m.poster) {
      row.append(el('span', { class: 'gb-poster', text: `poster ${m.poster}` }));
      if (n > 1) row.append(button(`delete all ${n} from ${m.poster}`, () => removePoster(m.poster!, n)));
    }
    li.append(row);
  });

export async function loadGuestbook() {
  messages = (await call<{ messages: Message[] }>('/admin/messages')).messages;
  show();
}

async function remove(m: Message) {
  if (!confirm(`Delete #${m.id} from ${m.name}?\n\n${m.message}`)) return;
  try {
    await call(`/messages/${m.id}`, { method: 'DELETE' });
    messages = messages.filter((x) => x.id !== m.id);
    show();
    say(`Deleted #${m.id}.`);
  } catch (e) { say(explain(e), true); }
}

async function removePoster(poster: string, n: number) {
  if (!confirm(`Delete all ${n} messages from poster ${poster}?`)) return;
  try {
    const { deleted } = await call(`/messages?poster=${poster}`, { method: 'DELETE' });
    messages = messages.filter((x) => x.poster !== poster);
    show();
    say(`Deleted ${deleted} from ${poster}.`);
  } catch (e) { say(explain(e), true); }
}

// your reply under a message: edit it in place, empty removes it
async function answer(m: Message) {
  const text = prompt(`Reply to ${m.name} (empty removes it):\n\n${m.message}`, m.reply ?? '');
  if (text === null) return;
  try {
    const d = await call(`/messages/${m.id}/reply`, { method: 'PUT', body: JSON.stringify({ reply: text }) });
    m.reply = d.reply;
    m.replied = d.replied ?? null;
    show();
    say(d.reply ? `Replied to #${m.id}.` : `Removed the reply on #${m.id}.`);
  } catch (e) { say(explain(e), true); }
}
