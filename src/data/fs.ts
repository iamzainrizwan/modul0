// static (non-blog) files in the terminal's fake filesystem. values are html
// strings, rendered as-is. blog/ is filled in at build time from
// src/content/blog. same facts as profile.ts, in the terminal's own voice -
// keep the two in sync.

export const whoami =
  'zain - cs @ kcl (y2) · treasurer @ kcl cybersoc<br>' +
  "i like breaking things (ctfs) and building things that don't break.";

export const status = 'ledgr: stats view shipped -> categoriser (stretch)';

export const birth = '2006-11-15';

export const files: Record<string, string> = {
  'about.txt':
    "alexandria: homelab, named after the library - if you're going to hoard knowledge, commit to the bit. " +
    'runs 1337, s3ntry, re::curse, an *arr stack and jellyfin.<br>' +
    "valhalla: blade 14 '23, dual-boot. speakers took a year to fix, then the aux broke. worth it.",
  'stack.txt': `<pre>
languages  > python, go, java, c#, c, typescript, bash
backend    > fastapi, flask, postgres, sqlite
infra      > linux, docker, nginx, systemd, github actions (self-hosted runners), azure.
             ssh tunnels into alexandria at 2am.
security   > ctf tooling, wireshark, educated guessing.</pre>`,
  'achievements.txt': `<pre>
> 50/~1000 - selected, google student ai hackathon (2026)
> 1st      - kcl informatics puzzled (team, of 200-300)
> top 5    - ucl vs kcl ctf
> top 5    - kcl welcome ctf
> finalist - uber global hackathon, mena (2023). accessibility case study + figma prototype, my first hackathon</pre>`,
  'experience.log': `<pre>
2026-05  treasurer, kcl cybersoc. pwn others and dont pwn yourself.
2025-11  lighting operator, king's tech crew. carrie: ~120 cues, 3 shows.
2025-07  infra/cloud intern, elecosoft. azure vnets + dns via cli, m365 mock tenancy.
2024-07  work experience, shell.
2021-12  lead technician, langley grammar. ~14 productions.
2020-09  digital leader, langley grammar. bett apple showcase.</pre>`,
  'productions.log': `<pre>
2025-11  carrie - king's tech crew, greenwood theatre. lighting op, ~120 cues x 3 shows.
2025     greased lightning - lgs, whole school
2024     high school musical - lgs, whole school
2024     senior house variety - lgs
2023     culture day parade - lgs
2023     bugsy malone - lgs
2022     the 25th annual putnam county spelling bee - lgs, seniors
2022     greased lightning - lgs, juniors
2022     end of year assembly - lgs
2021     christmas concert - lgs
         lgs: lighting + sound, ~14 in total counting the small ones.</pre>`,
  'status.log': status,
  'looking-for.txt':
    'summer 2027 internships, 2027/28 placements, and anything else that needs fixing {or is bound to}.',
  'contact.txt': `<pre>
email     > <a href="mailto:iamzainrizwan@gmail.com">iamzainrizwan@gmail.com</a>
linkedin  > <a href="https://www.linkedin.com/in/iamzainrizwan/">linkedin.com/in/iamzainrizwan</a>
github    > <a href="https://github.com/iamzainrizwan">github.com/iamzainrizwan</a></pre>`,
};

export const projects: Record<string, string> = {
  'ledgr.md':
    '<b>ledgr</b> - double-entry personal finance. immutable entries, idempotent posts, ' +
    'hsbc pdf + revolut parsers that self-check against printed totals, staged review before posting, stats by category + month. fastapi + sqlite, live on fly.io.',
  's3ntry.md':
    '<b>s3ntry</b> - ci/cd + monitoring for alexandria. self-hosted runner, ci gate, rollback path, ' +
    'go health daemon (goroutine per service) -> slack/discord alerts + live status page. mean alert 5.7s over 5 failure trials.',
  '1337.md':
    "<b>1337</b> - neetcode spaced-repetition tracker. claude and i's - vibecoded, used daily. flask + react, daily digest emails.",
  'recurse.md': '<b>re::curse</b> - daily interview prep emails via gemini. questions at 11, solutions at 23.',
  'sherpa.md': '<b>sherpa</b> - google student ai hackathon, team of 6. gemini career dashboard for students. i built the latex cv generator + the dashboard redesign.',
  'educhain.md': '<b>educhain</b> - easya x algorand hackathon. credential verification on algorand, with an nft per credential. first coding hackathon: i mostly learned the team\'s code and got it deployed. <a href="https://github.com/SCGR-1/Hackathon_10.18">repo</a>.',
  'modul0.md': '<b>modul0</b> - this site. astro + react. you found the terminal. named after the % operator: <a class="run" href="#" data-cmd="man modul0">man modul0</a>.',
};
