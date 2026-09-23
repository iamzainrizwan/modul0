// static (non-blog) files in the fake filesystem. values are html strings,
// rendered as-is by the terminal. blog/ is filled in at build time from
// src/content/blog.

export const whoami =
  'zain - cs @ kcl (y2) · kcl cybersoc treasurer<br>' +
  'heading toward: sre / security engineering / distributed systems';

export const status = 'rebuilding modul0 (you are looking at it)';

export const birth = '2006-11-15';

export const files: Record<string, string> = {
  'about.txt':
    "home lab named after the library of alexandria - because if you're going to hoard knowledge, commit to the bit. " +
    'currently running a node webapp and re::curse, occasionally catches fire (metaphorically). ' +
    "valhalla (razer blade 14 '23, dual-boot) handles the rest. speakers don't work. it's fine (it's not)",
  'stack.txt': `<pre>
languages  > java, python, go, c#, bash
infra      > linux, docker, nginx, github actions, ssh tunnels into alexandria at 2am.
security   > ctf tooling, wireshark, educated guessing.</pre>`,
  'achievements.txt': `<pre>
> 1st - kcl informatics puzzled (team, of 200-300)
> regional finalist - uber global hackathon, mena
> top 5 - ucl vs kcl ctf, kcl welcome ctf</pre>`,
  'status.log': status,
  'contact.txt': `<pre>
email     > <a href="mailto:iamzainrizwan@gmail.com">iamzainrizwan@gmail.com</a>
linkedin  > <a href="https://www.linkedin.com/in/iamzainrizwan/">linkedin.com/in/iamzainrizwan</a>
github    > <a href="https://github.com/iamzainrizwan">github.com/iamzainrizwan</a></pre>`,
};

export const projects: Record<string, string> = {
  'ledgr.md':
    '<b>ledgr</b> - double-entry personal finance. immutable entries, idempotent posts, ' +
    'hsbc pdf + revolut parsers that self-check against printed totals. fastapi + postgres. categoriser next.',
  's3ntry.md':
    '<b>s3ntry</b> - deploy + monitoring tooling for alexandria. ci/cd on a self-hosted runner, ' +
    'a go health-check daemon (goroutine per service), alerting via webhook.',
  '1337.md':
    '<b>1337</b> - spaced-repetition tracker for neetcode 150/250, self-hosted on alexandria. ' +
    'flask api + react spa, anki-style rescheduling, daily digest emails.',
  'modul0.md':
    '<b>modul0</b> - this site. a terminal that happens to be a portfolio. astro, static, no framework js.',
};
