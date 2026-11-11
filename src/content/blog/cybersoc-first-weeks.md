---
title: A month of CyberSoc events
date: 2026-11-01
description: KCL CyberSoc's welcome fair stall, an intro to CTF tooling, WelcomeCTF, then Patch Wednesday, where players fixed the bugs instead of exploiting them. What we ran, what broke, and what I'd change.
---

I've run a few events for KCL's Cyber Security Society this first half of Semeset 1, alongside buliding aesthetics for its [Instagram](/projects/#project-cybersoc-git) and making our [website](/projects/#project-kclcybersoc)! These sessions each built on each other: a welcome session about cyber tools, a CTF to use them in, and then a workshop focused on fixing what the CTF taught people to break.

## Welcome fair

This year, we had a monitor alongside and a few laptops. A piece of paper we got also read "WE HATE CODING", but if you browse this site for any considerable length of time you can find out that I don't know how much *I personally* agree with that. Still, we had a jar of sweets for people to take, some interesting discussions and a lot of interested freshers so I'd say it was a success overall, with a recorded hack on the monitor and a small demo on wifi passwords on another laptop. I also demoed some unsafe code, and asked people to try and fix it (a small peek into a session that was, at the time, just an idea)

## Intro to CTF tooling

![The Instagram carousel for intro to CTF tooling: six slides styled as terminal output (a man page, an nmap scan, an xxd dump, a boot log, a git diff), each ending on the event title.](/blog/cybersoc-first-weeks/intro-carousel.webp)


On Oct 14th about twenty? people came to a two hour session on the tools most people should reach for in a beginner CTF. It ran in 4 rounds of roughly 20mins each, with each round covering a different tool:

- **CyberChef**, for doing multiple layered opeartions (Caesar shifts, hex, base64)
- **Devtools**, an expansion on the classic inspect element into reading a page's source and network data
- **File forensics**, for what hides in files and, in particular, images, far beyound what they initially show
- **Wireshark**, for navigating packet captures


Each round had a sample challenge that I went through and a main one that the attendees got to try, all on a CyLab classroom. 9 more challenges made a miniCTF at the end of the session, with a lot of people getting their first ever solves!! 

This was an amazing turnout for our first session of the year, and it was also my first experience directly teaching others cyber content that I myself was once also new to. 


## WelcomeCTF!



A week later, on the 21st of October, we ran the society's 2nd? (I think? I don't know if we did one before last year) WelcomeCTF: a two hour beginner CTF with a briefind, an hour of hacking, then walkthroughs and a prize. 

![The three WelcomeCTF Instagram posts: the title card, the plan for the afternoon, and "never done a ctf? good."](/blog/cybersoc-first-weeks/welcomectf-carousel.webp)

- **27 players** registered, plus a few who turned up without
  registering. 26 of them scored, each with at least one solve.
- **19 challenges** across web, forensics, misc, git, pwn, rev and docker, and every one was solved at least once.
- **146 correct flags.** A player's solves ranged from 1 to 15, with a median of 5.

![The WelcomeCTF title on the projector at the front of the room, with players at their desks.](/blog/cybersoc-first-weeks/projector.webp)


The browser-only web challenges were the most solved, which to me was the point of them - they're where a beginner gets their first flag. I remember solving similar such challenges first myself! The hard end, however, held up, with three challenges only solved by one person each. Hopefully this means they can be reused for next year... ? ;)

![The room mid-CTF: rows of players at their laptops and desktop machines.](/blog/cybersoc-first-weeks/room.webp)

Nobody ran out of things to try. There were 16 solves in the first ten minutes, a peak of 35 in the middle, and still 27 in the last ten. The last one landed under half a second before the board closed, and moved its solver from fifth to third.

![Walkthroughs at the end, with the scoreboard graph on the projector.](/blog/cybersoc-first-weeks/walkthroughs.webp)

### Behind it


Two of us ran the room. The projector was CTFd behind Caddy on one of my VMs, the challenges ran in Docker Compose on another. Every container was read-only with memory, CPU, and process limits. The same jail challenge that infuriated me last year had a terminal in the browser this year, so nobody needed netcat installed. 

![The CTFd challenge board, grouped by category.](/blog/cybersoc-first-weeks/ctfd-board.webp)

![A challenge open on the board: its description, the flag format and an input for the flag.](/blog/cybersoc-first-weeks/ctfd-challenge.webp)

It wasn't all sunshine and rainbows! One challenge broke in the first 15mins of the hacking hour. It was a SQL injection challenge, that would return a server error on almost every login. This was because it kept a single SQLite connection for the whole app, and Flask serves each request on its own thread. SQLite, as it turns out, instead binds database connections to the thread that created them. The fix was to rebuild the database per request, and then we redeployed that singular container.

You ever play Minecraft? And when you hit a silverfish in that game, its friends come out to play? Yeah, that happened here. A second bug arose, where half finished injections, eg an unmatched quote, crashed the challenge in such a way that it look tot beginners like the entire challenge was down. The solution this time? Catching the error and showing it to the user, which doubled as a hint! Thankfully, the challenges held for the rest of the event, and for the week I kept them up afterward.

Both bugs had passed my testing beforehand, since I had just been running singular solves as one person. We added to our writeup that we should try concurrent requests next time!

## Patch Wednesday


The week after, on the 28th of October, we swapped it. That idea from Welcome Fair came to life, and we ran a blue team workshop. Last week they broke systems, now this week they learnt how to fix them.


![The Patch Wednesday Instagram post: a git diff where "i only know how to break things" becomes "i can fix them too", and a blocklist for ' OR 1=1 becomes parameterised queries.](/blog/cybersoc-first-weeks/patch-wednesday-post.webp)

Each attendee made their own copy of my
[template repo](https://github.com/iamzainrizwan/patch-wednesday): a small Flask app with five planted bugs, one per file.

- **login**: SQL injection, fixed with a parameterised query
- **notes**: an IDOR, fixed by checking the note belongs to whoever asked
- **files**: path traversal, fixed by resolving the path and checking it was still inside the public folder
- **tools**: command injection, fixed by passing arguments as a list with shell access
- **redirect after login**: an open redirect, fixed by allowing only paths


Every bug shipped with a test that ran the exploit. Push a fix, GH Actions runs the tests, and the cross only turns into a tick when the exploit stops working and the app still works regularly. A blocklist that catches `' OR 1=1` doesn't count, because the tests try more than just the example payloads. So it doubles as an intro to git and to tests deciding what ships, the parts of a codebase nobody showed me in first year until I started making stuff myself.


A handful of people came, and the copies I saw walking around showed attendees pushing fix after fix throughout until all tests pasts, and at least two of the ones I saw went all the way to green!


## Next time

- Fire concurrent requests at every service before the day.
- No challenge should crash on bad input: show an error the player can act on.
- Slow the briefing down. The tools are where beginners need the time.
- Take a headcount and a feedback form at the door, at every event.
- Three people in the room, so someone can watch the logs.
- Check the time on a post against the room booking before it goes out.
