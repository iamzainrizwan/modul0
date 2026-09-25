// what this build is: the commit it came from and when that commit was made
// (not when it was built: the daily snake rebuild would make every stamp
// look fresh). read from git at build time; empty outside a checkout.
import { execSync } from 'node:child_process';

const git = (args: string) => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};

const sha = process.env.GITHUB_SHA || git('rev-parse HEAD');
export const build = {
  sha,
  short: sha.slice(0, 7),
  // iso, the commit's own time
  at: git('log -1 --format=%cI') || new Date().toISOString(),
  url: sha ? `https://github.com/iamzainrizwan/modul0/commit/${sha}` : '',
};
