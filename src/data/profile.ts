// everything the site says about zain. every claim here must trace to a
// source: the current cv (vault cv/bsc/cv-master.tex, never the DREAM blocks
// or cv/dream/), linkedin (profile + posts, pasted by zain 2026-09-23), the
// github profile README, a project's own README, or something zain confirmed
// directly. don't add unsourced claims.
//
// sherpa: the shipped project is the team repo (josephmeadowcroft/sherpa),
// not zain's own abandoned sherpa repo; details come from his commits there.
//
// confirmed by zain: degree is stated as "year 2 cs @ kcl" (no bsc/msci);
// uber = regional finalist (not 2nd), zain's first hackathon: the
// accessibility business case route with a figma prototype (so
// educhain is zain's first coding hackathon); ctf = top 5 in ucl vs kcl + kcl welcome.
// happy to relocate for an internship or placement (year in industry):
// confirmed by zain 2026-09-25.
// kcl average (79.6%) is credit-weighted from zain's year 1 transcript:
// programming practice and applications counts 2x, introduction to
// professional practice is excluded (0 credits, capped at 70). confirmed by
// zain 2026-09-24. module marks below are from the same transcript.
//
// strings may contain [text](url) links, rendered by src/data/inline.ts.
//
// the terminal (src/data/fs.ts) keeps its own lowercase voice - update both
// when a project changes.
//
// the data itself lives in src/data/content/*.json so the admin page can edit
// it (each save is a commit); this file keeps the types and the notes. notes
// that used to sit beside their entries:
// - person.headline: his linkedin about, lightly capitalised.
// - homelab.failureTest: the deliberate failure test against a live
//   monitored service (cv).
// - awards: ctf dates unconfirmed; both were at kcl, which started sep 2025.
// - productions: titles, years and types from zain's old theatre site
//   (iamzainrizwan/zain-codes-the-stage, src/pages/Theatre.tsx), not its prose;
//   carrie from zain 2026-09-24 (the same run as the king's tech crew role).
//   the lgs list is the named ones: smaller events make up the rest of the
//   "about 14" (zain). role at lgs is the cv's.

import profile from './content/profile.json';
import projects from './content/projects.json';
import lab from './content/homelab.json';
import cv from './content/cv.json';
import prod from './content/productions.json';

export const person = profile.person;
export const links = profile.links;

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

export const featured = projects.featured as Project[];
export const archive = projects.archive as Project[];

export const homelab = lab;

export type Role = { org: string; url?: string; role: string; place: string; when: string; details: string[] };

export const experience: Role[] = cv.experience;
export const education: Role[] = cv.education;
export const leadership: Role[] = cv.leadership;

export type Production = { title: string; when: string; org: string; kind?: string; role: string; venue?: string };

export const productions: Production[] = prod.productions;
export const awards = cv.awards;
export const hackathons = cv.hackathons;
export const skills = cv.skills;
export const certifications = cv.certifications;
export const interests = cv.interests;
