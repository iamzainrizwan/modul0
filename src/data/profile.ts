// content for the readable site, written for non-technical readers.
// the terminal (src/data/fs.ts) keeps its own, more technical voice -
// update both when a project changes.

export const name = 'Zain Rizwan';

export const intro = [
  "I'm a second-year Computer Science student at King's College London. I'm most interested in what happens to software after it ships: deploying it, monitoring it, and keeping it secure.",
  "Outside lectures I'm treasurer of KCL's Cyber Security Society and compete in capture-the-flag security competitions.",
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
      'A personal finance app that reads my HSBC and Revolut bank statements, checks each one against its own printed balance, and records every transaction in a double-entry ledger. Automatic spending categories are next.',
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
  'My team placed 1st of 200 to 300 undergraduates in KCL Informatics Puzzled',
  'Regional finalist, Uber Global Hackathon (Middle East and North Africa, 2023)',
  'Top 5 in the UCL vs KCL CTF and the KCL Welcome CTF',
];

// shown as "label: text" so the address itself is visible and copyable
export const links = [
  { label: 'Email', text: 'iamzainrizwan@gmail.com', href: 'mailto:iamzainrizwan@gmail.com' },
  { label: 'LinkedIn', text: 'linkedin.com/in/iamzainrizwan', href: 'https://www.linkedin.com/in/iamzainrizwan/' },
  { label: 'GitHub', text: 'github.com/iamzainrizwan', href: 'https://github.com/iamzainrizwan' },
];
