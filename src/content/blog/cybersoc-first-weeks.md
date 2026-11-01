---
title: A month of CyberSoc events
date: 2026-11-01
description: KCL CyberSoc's welcome fair stall, an intro to CTF tooling, WelcomeCTF, then Patch Wednesday, where players fixed the bugs instead of exploiting them. What we ran, what broke, and what I'd change.
draft: true
---

I run (some) events for KCL's Cyber Security Society (and built aesthetics for its
[Instagram](/projects/#project-cybersoc-ig)). This term's first few built on
each other: a stall at the welcome fair, a session on the tools, a CTF to use
them in, then a workshop on fixing what the CTF taught people to break.

## Welcome fair

The society's year started at a stall at the welcome fair: a monitor and a
few laptops. One ran "what's wrong with this code?", short snippets with a
security bug for passers-by to spot, and the other a live coding demo on
wifi passwords.

## Intro to CTF tooling

![The Instagram carousel for intro to CTF tooling: six slides styled as terminal output (a man page, an nmap scan, an xxd dump, a boot log, a git diff), each ending on the event title.](/blog/cybersoc-first-weeks/intro-carousel.webp)

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

![The three WelcomeCTF Instagram posts: the title card, the plan for the afternoon, and "never done a ctf? good."](/blog/cybersoc-first-weeks/welcomectf-carousel.webp)

- **27 players** registered, plus about five who turned up without
  registering. 26 of them scored, every one with at least one solve.
- **19 challenges** across web, forensics, misc, git, pwn, rev and docker,
  and every one was solved at least once.
- **146 correct flags.** A player's solves ranged from 1 to 15, with a
  median of 5.

![The WelcomeCTF title on the projector at the front of the room, with players at their desks.](/blog/cybersoc-first-weeks/projector.webp)

The four browser-only web challenges were the most solved, which is the point
of them: they're where a beginner gets their first flag. The hard end held up
too, with three challenges solved by one person each.

![The room mid-CTF: rows of players at their laptops and desktop machines.](/blog/cybersoc-first-weeks/room.webp)

Nobody ran out of things to try. There were 16 solves in the first ten
minutes, a peak of 35 in the middle, and still 27 in the last ten. The last
one landed under half a second before the board closed, and moved its solver
from fifth to third.

![Walkthroughs at the end, with the scoreboard graph on the projector.](/blog/cybersoc-first-weeks/walkthroughs.webp)

### Behind it

Two of us ran the room. The board was CTFd behind Caddy on one Azure VM; the
challenges ran in Docker Compose on another, every container read-only with
memory, CPU and process limits. The jail challenge had a terminal in the
browser, so nobody needed netcat installed.

![The CTFd challenge board, grouped by category.](/blog/cybersoc-first-weeks/ctfd-board.webp)

![A challenge open on the board: its description, the flag format and an input for the flag.](/blog/cybersoc-first-weeks/ctfd-challenge.webp)

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

## Patch Wednesday

The week after, on 28 October, we flipped it round: a blue team workshop.
Last week you broke things; this week you fix them.

![The Patch Wednesday Instagram post: a git diff where "i only know how to break things" becomes "i can fix them too", and a blocklist for ' OR 1=1 becomes parameterised queries.](/blog/cybersoc-first-weeks/patch-wednesday-post.webp)

Each player made their own copy of a
[template repo](https://github.com/iamzainrizwan/patch-wednesday): a small
Flask app with five planted bugs, one per file.

- **login**: SQL injection, fixed with a parameterised query
- **notes**: an IDOR, fixed by checking the note belongs to whoever asked
- **files**: path traversal, fixed by resolving the path and checking it's
  still inside the public folder
- **tools**: command injection, fixed by passing arguments as a list with no
  shell
- **redirect after login**: an open redirect, fixed by allowing only local
  paths

Every bug ships with a test that runs the exploit. You push a fix, GitHub
Actions runs the tests, and the cross only turns into a tick when the
exploit stops working and the app still does its normal job. A blocklist
that catches `' OR 1=1` doesn't count, because the tests try more than one
payload. So it doubles as an intro to git and to tests deciding what ships,
the parts of a codebase nobody shows you in first year.

It opened with red vs blue (why a blocklist isn't a fix), then we fixed
login together on the projector: write the lazy blocklist, push, watch it
stay red, write the real fix, push, watch it go green. Then the room had
notes and files to do on their own, with bonuses for anyone who finished
early, and walkthroughs of every fix at the end.

A handful of people came, and the copies I can see show players pushing
fix after fix through the afternoon until the tests passed, at least two of
them all the way to green. I ran this one solo.

One thing went wrong before anyone arrived: the first post said 14:00, and
the session was 13:00. The day-before reminders never went out either, so
on the morning we put out a correction on Instagram and Discord, folding in
the setup steps (a GitHub account, git installed) the reminders would have
carried.

## Next time

- Fire concurrent requests at every service before the day.
- No challenge should crash on bad input: show an error the player can act on.
- Slow the briefing down. The tools are where beginners need the time.
- Take a headcount and a feedback form at the door, at every event.
- Three people in the room, so someone can watch the logs.
- Check the time on a post against the room booking before it goes out.
