// shared by the guestbook and its admin page. messages are user-written, so
// everything goes in with textContent, never innerHTML.
export type Message = { id: number; name: string; message: string; created: string; poster?: string };

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
