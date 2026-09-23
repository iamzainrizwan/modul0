// content for the readable site, written for non-technical readers.
// the terminal (src/data/fs.ts) keeps its own, more technical voice -
// update both when a project changes.

export const name = 'Zain Rizwan';

export const intro = [
  "I study Computer Science (MSci) at King's College London. I'm most interested in what happens to software after it ships: deploying it, monitoring it, and keeping it secure.",
  'Outside lectures I compete in capture-the-flag security competitions with KCL CyberSoc and tutor students in programming.',
];

export const lookingFor = "I'm looking for summer 2027 internships in site reliability, security or backend engineering.";

export type Project = {
  name: string;
  summary: string;
  stack: string[];
  status: string;
  repo: string;
};

export const projects: Project[] = [
  {
    name: 'ledgr',
    summary:
      'A personal finance app that reads my bank statements from three UK banks, records every transaction in a double-entry ledger, and sorts spending into categories automatically.',
    stack: ['Python', 'FastAPI', 'PostgreSQL'],
    status: 'In progress',
    repo: 'https://github.com/iamzainrizwan/ledgr',
  },
  {
    name: 's3ntry',
    summary:
      "The deployment and monitoring setup for my home server. Every push is tested and deployed automatically, and a small Go service checks each app is healthy and sends an alert when one isn't.",
    stack: ['Go', 'GitHub Actions', 'Docker', 'nginx'],
    status: 'In progress',
    repo: 'https://github.com/iamzainrizwan/s3ntry',
  },
  {
    name: '1337',
    summary:
      'A spaced-repetition tracker for coding interview practice. It decides which problems to revisit and when, and emails me a daily summary.',
    stack: ['Python', 'Flask', 'React', 'TypeScript'],
    status: 'In daily use on my home server',
    repo: 'https://github.com/iamzainrizwan/1337',
  },
];

export const achievements = [
  'Won KCL Informatics Puzzled',
  'Second place at the Uber Global Hackathon',
  "Top 5 twice in King's College London CTF competitions",
];

// shown as "label: text" so the address itself is visible and copyable
export const links = [
  { label: 'Email', text: 'iamzainrizwan@gmail.com', href: 'mailto:iamzainrizwan@gmail.com' },
  { label: 'LinkedIn', text: 'linkedin.com/in/iamzainrizwan', href: 'https://www.linkedin.com/in/iamzainrizwan/' },
  { label: 'GitHub', text: 'github.com/iamzainrizwan', href: 'https://github.com/iamzainrizwan' },
];
