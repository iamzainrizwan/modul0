// shared by the guestbook and its admin page. messages are user-written, so
// everything goes in with textContent, never innerHTML.
export type Message = { id: number; name: string; message: string; created: string; poster?: string; reply?: string | null; replied?: string | null };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function renderMessages(list: HTMLElement, messages: Message[], extra?: (m: Message, li: HTMLLIElement) => void) {
  list.replaceChildren(
    ...messages.map((m) => {
      const li = document.createElement('li');
      const head = document.createElement('p');
      head.className = 'gb-head';
      const name = document.createElement('span');
      name.className = 'gb-name';
      name.textContent = m.name;
      const time = document.createElement('time');
      time.dateTime = m.created;
      time.textContent = date(m.created);
      head.append(name, time);
      const body = document.createElement('p');
      body.className = 'gb-body';
      body.textContent = m.message;
      li.append(head, body);
      // zain's reply, indented under the message
      if (m.reply) {
        const box = document.createElement('div');
        box.className = 'gb-reply';
        const rhead = document.createElement('p');
        rhead.className = 'gb-head';
        const who = document.createElement('span');
        who.className = 'gb-name';
        who.textContent = '↳ zain';
        rhead.append(who);
        if (m.replied) {
          const t = document.createElement('time');
          t.dateTime = m.replied;
          t.textContent = date(m.replied);
          rhead.append(t);
        }
        const rbody = document.createElement('p');
        rbody.className = 'gb-body';
        rbody.textContent = m.reply;
        box.append(rhead, rbody);
        li.append(box);
      }
      extra?.(m, li);
      return li;
    }),
  );
  if (!messages.length) {
    const li = document.createElement('li');
    li.className = 'gb-empty';
    li.textContent = 'No messages yet. Be the first.';
    list.append(li);
  }
}
