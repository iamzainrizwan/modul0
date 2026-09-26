// what this build is: the commit it came from and when that commit was made
// (not when it was built: the daily snake rebuild would make every stamp
// look fresh), plus the last few commits for the terminal's `git log`. read
// from git at build time (ci checks out 20 commits deep); empty outside a checkout.
import { execSync } from 'node:child_process';

const git = (args: string) => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};

const REPO = 'https://github.com/iamzainrizwan/modul0';
const sha = process.env.GITHUB_SHA || git('rev-parse HEAD');

export type Commit = { sha: string; date: string; subject: string };

export const build = {
  sha,
  short: sha.slice(0, 7),
  // iso, the commit's own time
  at: git('log -1 --format=%cI') || new Date().toISOString(),
  url: sha ? `${REPO}/commit/${sha}` : '',
  repo: REPO,
  log: git('log -15 --format=%H%x09%cs%x09%s')
    .split('\n')
    .filter(Boolean)
    .map((l): Commit => {
      const [sha, date, ...subject] = l.split('\t');
      return { sha, date, subject: subject.join('\t') };
    }),
};
