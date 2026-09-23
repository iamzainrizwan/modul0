// everything the site says about zain. every claim here must trace to a
// source: the current cv (vault cv/bsc/cv-master.tex, never the DREAM blocks
// or cv/dream/), linkedin (profile + posts, pasted by zain 2026-09-23), the
// github profile README, a project's own README, or something zain confirmed
// directly. don't add unsourced claims.
//
// confirmed by zain: degree is stated as "year 2 cs @ kcl" (no bsc/msci);
// uber = regional finalist (not 2nd); ctf = top 5 in ucl vs kcl + kcl welcome.
//
// the terminal (src/data/fs.ts) keeps its own lowercase voice - update both
// when a project changes.

export const person = {
  name: 'Zain Rizwan',
  handle: 'iamzainrizwan',
  study: "Year 2 Computer Science, King's College London",
  location: 'London, UK',
  birth: '2006-11-15',
  // his linkedin about, lightly capitalised
  headline: "I like breaking things (CTFs) and building things that don't break.",
  intro: [
    "I'm a second-year Computer Science student at King's College London and treasurer of KCL's Cyber Security Society, interested in site reliability, software engineering and security.",
    'Most of what I build is useful little tools running on my own server, alexandria. I built the pipeline that deploys to it and the monitor that tells me when something on it breaks.',
  ],
  lookingFor:
    "Looking for summer 2027 internships, 2027/28 placements, and anything else that needs fixing (or is bound to). On-site, hybrid or remote, London area.",
  now: 'ledgr: statement parsers done, building the categoriser',
};

export const links = [
  { label: 'Email', text: 'iamzainrizwan@gmail.com', href: 'mailto:iamzainrizwan@gmail.com' },
  { label: 'LinkedIn', text: 'linkedin.com/in/iamzainrizwan', href: 'https://www.linkedin.com/in/iamzainrizwan/' },
  { label: 'GitHub', text: 'github.com/iamzainrizwan', href: 'https://github.com/iamzainrizwan' },
];

export type Status = 'live' | 'building' | 'done';
export type Area = 'Infrastructure' | 'Backend' | 'AI & ML' | 'Data' | 'Embedded' | 'Apps';
export const areas: Area[] = ['Infrastructure', 'Backend', 'AI & ML', 'Data', 'Embedded', 'Apps'];

export type Project = {
  slug: string;
  name: string;
  year: string;
  tagline: string;
  summary: string;
  status: Status;
  statusText: string;
  stack: string[];
  areas: Area[];
  repo?: string;
  context?: string;
  details: string[];
};

export const featured: Project[] = [
  {
    slug: 'ledgr',
    name: 'ledgr',
    year: '2026',
    tagline: 'Double-entry personal finance',
    summary:
      'A personal finance system built the way accounting software is: every transaction becomes balanced, permanent ledger entries. It reads my real bank statements, checks each one against its own printed totals, and only then posts it.',
    status: 'building',
    statusText: 'In progress: categoriser next',
    stack: ['Python', 'FastAPI', 'PostgreSQL'],
    areas: ['Backend', 'Data'],
    repo: 'https://github.com/iamzainrizwan/ledgr',
    details: [
      'Double-entry ledger in FastAPI and PostgreSQL that enforces a balanced-entry invariant at write time.',
      'Posts are idempotent via an external ID, so re-importing the same statement never duplicates money.',
      'Entries are immutable: corrections are reversals, never updates or deletes.',
      'Hierarchical accounts (Assets:Checking:HSBC, Income:Salary). Balances are always computed by query, never stored.',
      'Bank-specific parsers for HSBC (PDF) and Revolut (Excel/CSV), each validating itself against the statement’s printed balance before posting anything.',
      'Planned: automatic categorisation with a manual correction UI, cross-account stats, spending anomalies, and an anonymised CSV export for use with LLMs.',
    ],
  },
  {
    slug: 's3ntry',
    name: 's3ntry',
    year: '2026',
    tagline: 'Deploys and monitoring for my homelab',
    summary:
      'The deployment pipeline and monitoring for alexandria. A push to main is tested and deployed with no manual steps, and a Go health daemon watches every service and alerts Slack and Discord when one goes down or recovers.',
    status: 'live',
    statusText: 'Running on alexandria',
    stack: ['Go', 'GitHub Actions', 'Docker', 'systemd', 'nginx'],
    areas: ['Infrastructure'],
    repo: 'https://github.com/iamzainrizwan/s3ntry',
    details: [
      'Self-hosted GitHub Actions runner on alexandria with a CI gate and a rollback path. Push to main deploys with no manual intervention.',
      'Deploys run as a dedicated non-root user with SSH deploy keys, and that user deliberately has no sudo anywhere in the pipeline.',
      'Go health daemon (one static binary, one goroutine per service) polls services concurrently and tracks up/down state and latency.',
      'It also checks the host itself: connectivity, whether a reboot is required, and pending apt updates.',
      'The daemon runs as a systemd user service rather than in Docker, because a container would report its own reboot and update state, not the host’s.',
      'Slack and Discord webhook alerts on down and recovery, so “is it up?” never needs an SSH session.',
      'Proved end to end by deploying 1337 to production on alexandria.',
    ],
  },
  {
    slug: '1337',
    name: '1337',
    year: '2026',
    tagline: 'Spaced repetition for interview prep',
    summary:
      'A spaced-repetition tracker for the NeetCode 150. It schedules each problem for review after a day, a week and three weeks, paces me toward a deadline, and emails a digest every morning. Mostly built with Claude, and a tool I use daily rather than a portfolio piece.',
    status: 'live',
    statusText: 'In daily use',
    stack: ['Python', 'Flask', 'React', 'TypeScript', 'SQLite', 'Docker'],
    areas: ['Apps', 'Backend'],
    repo: 'https://github.com/iamzainrizwan/1337',
    details: [
      'Four-stage review cycle (solve, +1 day, +1 week, +3 weeks). “Struggled” resets a problem to a next-day review instead of advancing it.',
      'Gaps count from the day a review actually happens, so being late shifts later reviews out instead of piling them up, like Anki.',
      'Deadline-based pacing is recomputed on every load and flags the goal as unrealistic past 8 new problems a day.',
      'The daily digest runs in-process, so a single gunicorn worker is deliberate: a second would send duplicate emails.',
      'Deployed to alexandria by s3ntry’s pipeline, behind nginx.',
    ],
  },
];

export const archive: Project[] = [
  {
    slug: 'recurse',
    name: 're::curse',
    year: '2026',
    tagline: 'Daily interview-prep emails',
    summary:
      'Generates a daily set of interview questions with Gemini, stores it in SQLite, and emails the questions at 11:00 and the solutions at 23:00.',
    status: 'live',
    statusText: 'Runs on alexandria',
    stack: ['Node.js', 'Gemini', 'SQLite', 'Resend', 'pm2'],
    areas: ['Backend', 'AI & ML'],
    details: [
      'Can read my CV (PDF or .tex) and inject it into the prompt to tailor the conceptual question to my background.',
      'An always-on homelab service, and one more thing s3ntry watches.',
    ],
  },
  {
    slug: 'sherpa',
    name: 'Sherpa',
    year: '2026',
    tagline: 'Google Student AI Hackathon',
    summary:
      'Built by a team of six at the 2026 Google Student AI Hackathon in London, where 50 students were selected from nearly 1,000 applicants. Sherpa gives students personalised life and career direction based on everything it knows about them.',
    status: 'done',
    statusText: 'Hackathon, July 2026',
    stack: ['Next.js', 'TypeScript', 'Python', 'Gemini', 'Google OAuth'],
    areas: ['AI & ML', 'Apps'],
    repo: 'https://github.com/iamzainrizwan/sherpa',
    context: 'Team of 6',
    details: [
      'I owned auth and AI integration: Google OAuth, Google Calendar fetching, and the Gemini reasoning call.',
      'Gemini returns structured JSON (ranked priorities with reasoning and effort estimates), not prose.',
      'A mock-data fallback behind one environment variable, so the live demo survives OAuth or API failures.',
    ],
  },
  {
    slug: 'educhain',
    name: 'EduChain',
    year: '2025',
    tagline: 'EasyA x Algorand London Hackathon',
    summary:
      'Instant credential verification for international students, whose visa paperwork can take weeks. Students manage and share verified credentials on the Algorand blockchain. Built in 36 hours at my first in-person hackathon.',
    status: 'done',
    statusText: 'Hackathon',
    stack: ['Algorand', 'Smart contracts'],
    areas: ['Backend', 'Apps'],
    context: 'Team project',
    details: [
      'Used Algorand stateful smart contracts and atomic transactions.',
      'Presented it to the judges, which was also my first technical presentation.',
    ],
  },
  {
    slug: 'hedge-fund',
    name: 'Hedge fund factor analysis',
    year: '2026',
    tagline: 'AAM data science challenge, part 2',
    summary: 'Multilinear regression of hedge fund returns against 18 systematic risk factors, with a written report.',
    status: 'done',
    statusText: 'Complete',
    stack: ['Python', 'pandas', 'statsmodels', 'matplotlib'],
    areas: ['Data'],
    repo: 'https://github.com/iamzainrizwan/hedge-fund-analysis',
    details: [
      'Selected significant factors by p-value and compared full and reduced OLS models.',
      'Checked assumptions with residual and Q-Q plots and a Breusch-Pagan heteroskedasticity test.',
      'Compared the fund with a passive factor portfolio on Sharpe ratio, annualised volatility and maximum drawdown.',
      'Tested beta stationarity with rolling regressions and augmented Dickey-Fuller tests.',
    ],
  },
  {
    slug: 'scraper',
    name: 'GitHub scraper chatbot',
    year: '2026',
    tagline: 'AAM data science challenge, part 1',
    summary:
      'Scrapes a GitHub user’s public repositories, exports them to a spreadsheet, and loads them into a Gemini chatbot you can question about that person’s work.',
    status: 'done',
    statusText: 'Complete',
    stack: ['Python', 'BeautifulSoup', 'CustomTkinter', 'Gemini'],
    areas: ['AI & ML', 'Data'],
    repo: 'https://github.com/iamzainrizwan/github-scraper-chatbot',
    details: ['HTML scraping with no API key required, plus .xlsx export of the repository list.'],
  },
  {
    slug: 'asthma',
    name: 'Asthma',
    year: '2026',
    tagline: 'Air pollution visualiser',
    summary: 'A JavaFX app for exploring air pollution statistics on a map, built by a team of four at KCL.',
    status: 'done',
    statusText: 'Coursework',
    stack: ['Java', 'JavaFX', 'JUnit 5'],
    areas: ['Apps', 'Data'],
    context: 'Team of 4',
    details: [
      'Owned the statistics engine: mean, median, standard deviation, peak, top-N, per-year comparison and trend over time.',
      'Built the statistics panel on top of it (summary, highest-recorded table, trends chart, year comparison) with async loading and error states.',
      'Wrote a 27-test JUnit 5 suite covering empty-dataset, single-point and multi-dataset edge cases.',
      'Feature branch per teammate, reviewed PRs, rebased onto main to keep history linear.',
    ],
  },
  {
    slug: 'arduino-asm',
    name: 'Arduino in assembly',
    year: '2026',
    tagline: 'ATmega328P, no C',
    summary: 'Programmed an ATmega328P in raw assembly to show Morse code and binary patterns on LEDs.',
    status: 'done',
    statusText: 'Coursework',
    stack: ['AVR assembly'],
    areas: ['Embedded'],
    details: [],
  },
  {
    slug: 'rl-unity',
    name: 'Reinforcement learning in Unity',
    year: '2025',
    tagline: 'DQN vs PPO vs NEAT, from scratch',
    summary:
      'My A-Level Computer Science project: agents learn a game of tag in Unity using three reinforcement-learning algorithms I implemented without any ML libraries.',
    status: 'done',
    statusText: 'A-Level NEA',
    stack: ['C#', 'Unity'],
    areas: ['AI & ML'],
    repo: 'https://github.com/iamzainrizwan/LearningAlgorithmsUnity',
    details: [
      'Neural networks (with an Adam optimiser), policy optimisation, and a NEAT genetic algorithm with mutation, crossover and speciation, all from scratch.',
      'Configurable environment: adjust hyperparameters before a run and watch learning progress in 3D.',
      'Per-round metrics (wins, reward, distance) exported to CSV and graphed live.',
      '18 tests, including hand-checked PPO and DQN maths and backprop within 5% of a Wine-dataset benchmark.',
    ],
  },
  {
    slug: 'nn-dotnet',
    name: 'Neural network from scratch',
    year: '2024',
    tagline: 'C# and NumSharp only',
    summary: 'A neural network written and tested from scratch in C#, later expanded and rebuilt for the Unity RL project.',
    status: 'done',
    statusText: 'Complete',
    stack: ['C#', 'NumSharp'],
    areas: ['AI & ML'],
    repo: 'https://github.com/iamzainrizwan/NeuralNetworkDOTNET',
    details: [],
  },
  {
    slug: 'glider',
    name: 'RF-controlled glider',
    year: '2024',
    tagline: 'It flew. Not always where intended.',
    summary:
      'Two Arduinos: a joystick controller that encodes and transmits inputs over RF, and a receiver on the glider that drives its servos.',
    status: 'done',
    statusText: 'Complete',
    stack: ['Embedded C', 'Arduino'],
    areas: ['Embedded'],
    details: ['Embedded C on both boards: signal encoding, transmission, decoding and motor actuation.'],
  },
  {
    slug: 'studyquest',
    name: 'StudyQuest',
    year: '2024',
    tagline: 'Gamified revision app, graded A',
    summary:
      'Pathway to Bath project: a social learning app that turns revision into quests. Designed in Figma and prototyped as a C# command-line app.',
    status: 'done',
    statusText: 'Grade A',
    stack: ['C#', 'Figma'],
    areas: ['Apps'],
    repo: 'https://github.com/iamzainrizwan/PTBPrototype',
    details: [
      'Space-themed Figma prototype with one-handed bottom navigation and colour-coded subjects.',
      'The C# prototype adds and completes quests, displays them as a table, and flags overdue ones.',
    ],
  },
];

export const homelab = {
  machines: [
    {
      name: 'alexandria',
      role: 'Homelab server',
      text: 'Ubuntu Server, named after the library: if you’re going to hoard knowledge, commit to the bit. Runs 1337, s3ntry and re::curse, plus a Dockerised *arr stack (Sonarr, Radarr, Prowlarr) and Jellyfin, behind nginx.',
    },
    {
      name: 'valhalla',
      role: 'Laptop',
      text: 'Razer Blade 14 ’23, dual-boot. The speakers took a year to fix, then the aux port broke. Worth it.',
    },
  ],
  services: ['1337', 're::curse', 'Jellyfin', '*arr stack'],
  // deliberate failure test against a live monitored service (cv)
  failureTest: {
    trials: 5,
    transitions: 8,
    meanAlert: '5.7s',
    pollInterval: '10s',
    finding: 'One outage shorter than the 10-second poll interval went undetected, a real limit of periodic polling.',
  },
};

export type Role = { org: string; role: string; place: string; when: string; details: string[] };

export const experience: Role[] = [
  {
    org: 'Elecosoft',
    role: 'Infrastructure / Cloud Intern',
    place: 'Aylesbury, UK (hybrid)',
    when: 'Jul 2025',
    details: [
      'Designed private IP addressing and subnetting for Azure VNets, with subnet delegation across environments.',
      'Deployed VNets and configured subnet delegation with the Azure CLI, replacing manual Portal workflows.',
      'Configured public and private DNS zones with VNet integration, so VMs resolve each other by name across environments.',
      'Built a Microsoft 365 Enterprise mock tenancy from scratch (accounts, security groups, shared mailing lists, SharePoint sites), cutting onboarding setup time by about 20%.',
    ],
  },
  {
    org: 'Shell & Microsoft',
    role: 'Work experience',
    place: 'London & Reading',
    when: '2023 – 2024',
    details: [
      'Shell (Jul 2024): three days of talks across AI, geosciences, exploration, strategy, fuels and lubricants, carbon capture, and legal and derivatives.',
      'Shadowed AI, geosciences and cybersecurity teams.',
      'Presented “Green Sustainability in the Age of AI” at Microsoft.',
    ],
  },
];

export const education: Role[] = [
  {
    org: "King's College London",
    role: 'Computer Science, Year 2',
    place: 'London, UK',
    when: 'Sep 2025 – present',
    details: [
      '79.6% average, predicted First.',
      'Societies: Cyber Security Society (treasurer), King’s Tech Crew, KCLTech.',
    ],
  },
  {
    org: 'Langley Grammar School',
    role: 'A-Levels and GCSEs',
    place: 'Slough, UK',
    when: '2018 – 2025',
    details: [
      'A-Level: Maths A*, Further Maths A, Physics A, Computer Science A.',
      'GCSE: 11 subjects including Further Maths, graded 9999998888.',
    ],
  },
];

export const leadership: Role[] = [
  {
    org: 'KCL Cyber Security Society',
    role: 'Treasurer',
    place: 'London (hybrid)',
    when: 'May 2026 – present',
    details: [
      'Manage the society’s termly budget, in the hundreds of pounds.',
      'Compete in inter-university CTFs, including SIGINT. Motto: pwn others and don’t pwn yourself.',
    ],
  },
  {
    org: 'King’s Tech Crew',
    role: 'Lighting operator',
    place: 'London',
    when: 'Nov 2025',
    details: ['Ran about 120 lighting cues across 3 shows.', 'Rigged and troubleshot the lighting rig and hazer.'],
  },
  {
    org: 'Langley Grammar School',
    role: 'Lead technician',
    place: 'Slough',
    when: 'Dec 2021 – Jun 2025',
    details: [
      'Ran lighting and sound for about 14 productions, for a total audience of 1,000+.',
      'Led teams producing other school events independently.',
      'Trained younger students to use professional audio and lighting equipment safely.',
    ],
  },
  {
    org: 'Langley Grammar School',
    role: 'Digital leader & esports mentor',
    place: 'Slough',
    when: 'Sep 2020 – Jun 2025',
    details: [
      'Staffed the Apple educator showcase at BETT, advising 200+ international educators on student iPad and AI adoption.',
      'Gave ad-hoc technical support to students and IT staff across hardware, software and network issues.',
      'Mentored the school esports team, growing participation by about 40%.',
    ],
  },
];

export const awards = [
  // ctf dates unconfirmed; both were at kcl, which started sep 2025
  { when: '2026', what: 'Selected for the Google Student AI Hackathon', detail: '50 chosen from nearly 1,000 applicants' },
  { when: '2025', what: '1st place, KCL Informatics Puzzled', detail: 'District Line team, of 200–300 undergraduates. Submitted 20 seconds before the deadline.' },
  { when: '2025–26', what: 'Top 5, UCL vs KCL CTF', detail: 'Capture the flag' },
  { when: '2025–26', what: 'Top 5, KCL Welcome CTF', detail: 'Capture the flag' },
  { when: '2023', what: 'Regional Finalist, Uber Global Hackathon', detail: 'Middle East & North Africa' },
];

export const hackathons = [
  { name: 'Google Student AI Hackathon', where: 'London', built: 'Sherpa' },
  { name: 'EasyA x Algorand London Hackathon', where: 'London, 36 hours', built: 'EduChain' },
  { name: 'Encode London', where: 'Encode Hub, Shoreditch', built: '' },
  { name: 'Uber Global Hackathon', where: 'MENA region', built: 'Regional finalist' },
];

export const skills = [
  { group: 'Languages', items: ['Python', 'Go', 'Java', 'C#', 'C / Embedded C', 'TypeScript', 'Bash'] },
  { group: 'Backend', items: ['FastAPI', 'Flask', 'PostgreSQL', 'SQLite'] },
  { group: 'Infrastructure', items: ['Linux', 'Docker', 'nginx', 'systemd', 'GitHub Actions', 'Self-hosted runners', 'Azure', 'Azure CLI', 'Git'] },
  { group: 'Security', items: ['CTF tooling', 'Wireshark'] },
  { group: 'Also', items: ['Unity', 'Figma', 'Arduino', 'Microsoft 365'] },
];

export const certifications = ['CS50P (Harvard)', 'CyberFirst Advanced (NCSC)', 'iDEA Gold', 'DofE Bronze'];

export const interests = [
  'Hiking',
  'Formula 1',
  'Modded Minecraft (curating technical packs like Nomifactory)',
  'Live music and concerts',
  'Astronomy',
  'Mechanical keyboards',
];
