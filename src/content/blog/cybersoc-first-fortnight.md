---
title: Two weeks of CyberSoc events
date: 2026-10-23
description: An intro to CTF tooling for about twenty people, then KCL CyberSoc's WelcomeCTF a week later. What we ran, what broke, and what I'd change.
draft: true
---

I run events for KCL's Cyber Security Society (and its
[Instagram](/projects/#project-cybersoc-ig)). The first two of the year went
together: a session on the tools, then a CTF to use them in.

## Intro to CTF tooling

On 14 October about twenty people came to a two-hour session on the tools
you reach for in a beginner CTF. It ran in four rounds of roughly twenty
minutes, one tool each:

- **CyberChef**, for peeling layered encodings (ROT13, URL, hex, base64)
- **Browser devtools**, for reading a page's source and what it sends
- **File forensics**, for what hides in a file beyond what it shows
- **Wireshark**, for reading a packet capture

Each round had a sample challenge and a main one, all on CyLab, and nine
more made up a mini-CTF in the CyLab classroom.

## WelcomeCTF

A week later, on 21 October, we ran the society's WelcomeCTF: a two-hour
beginner CTF with a briefing, an hour of hacking with the scoreboard on the
projector, then walkthroughs and a prize.

- **27 players** registered, plus about five who turned up without
  registering. 26 of them scored, every one with at least one solve.
- **19 challenges** across web, forensics, misc, git, pwn, rev and docker,
  and every one was solved at least once.
- **146 correct flags.** A player's solves ranged from 1 to 15, with a
  median of 5.

The four browser-only web challenges were the most solved, which is the point
of them: they're where a beginner gets their first flag. The hard end held up
too, with three challenges solved by one person each.

Nobody ran out of things to try. There were 16 solves in the first ten
minutes, a peak of 35 in the middle, and still 27 in the last ten. The last
one landed under half a second before the board closed, and moved its solver
from fifth to third.

## Behind it

Two of us ran the room. The board was CTFd behind Caddy on one Azure VM; the
challenges ran in Docker Compose on another, every container read-only with
memory, CPU and process limits. The jail challenge had a terminal in the
browser, so nobody needed netcat installed.

One challenge broke. For the first quarter of an hour, the SQL injection
challenge returned a server error on almost every login. It kept a single
SQLite connection for the whole app, and Flask serves each request on its
own thread, which SQLite refuses. We rebuilt its database per request and
redeployed that one container. Then half-finished injections, an unmatched
quote for example, crashed it in a way that looked to beginners like the
challenge was down. Catching the error and showing it on the login page fixed
that, and doubles as a hint. It held for the rest of the hour.

Both bugs passed our testing beforehand, because one request at a time never
lands on two threads.

## Next time

- Fire concurrent requests at every service before the day.
- No challenge should crash on bad input: show an error the player can act on.
- Slow the briefing down. The tools are where beginners need the time.
- Take a headcount and a feedback form at the door.
- Three people in the room, so someone can watch the logs.
