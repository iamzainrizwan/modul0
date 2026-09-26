---
title: Summer 2026, in review
date: 2026-09-26
description: A hackathon, four things I built and still use, a server that watches itself, and Toronto. The long version of a LinkedIn post.
---

I posted a list on LinkedIn. This is the version with the reasoning left in,
because a line per project doesn't say much about why any of it exists.

## Google Student AI Hackathon

Fifty students were picked from nearly a thousand applicants, and I was one of
them. A team of six of us built [Sherpa](/projects/#project-sherpa), an AI career
dashboard for students: a guidance chat on Gemini, CV scoring with rewrite
suggestions, and internship tracking.

My part was the "Generate updated CV" feature, which renders an improved CV
from a LaTeX template, plus a dashboard redesign, markdown rendering for the
chat replies, and fixing the auth and upload failures that were failing
silently.

## 1337

A spaced-repetition tracker for the [NeetCode 150](https://neetcode.io/practice).
Every problem comes back for review after a day, a week and three weeks, and
the app paces me toward a deadline and emails a digest every morning.

It's mostly built with Claude, and it's the tool I actually open every day, not
a portfolio piece. Two small rules do most of the work:
"struggled" sends a problem back to tomorrow instead of moving it on, and gaps
count from the day a review really happened, so a late review shifts the next
ones out instead of piling them up. [More on the projects page](/projects/#project-1337).

## re::curse

Interview prep by email. Every day it has Gemini write a set of questions,
keeps them in SQLite, and sends the questions at 11:00 and the solutions at
23:00. It can read my CV and tailor the conceptual question to it.

## ledgr

My [finance ledger](/projects/#project-ledgr), built the way accounting
software is. It reads my real bank statements (HSBC PDFs, Revolut exports),
checks each one against its own printed totals before posting anything, and
turns every transaction into balanced double-entry lines.

"Idempotent" in the LinkedIn post means this: every posting carries an
external ID, so importing the same statement twice never counts the money
twice. Entries are never edited or deleted either; a mistake gets a reversal.
There's a [live demo](https://ledgr-demo.fly.dev/) if you want to throw a
statement at it.

## s3ntry

[s3ntry](/projects/#project-s3ntry) is the deploy
pipeline and monitoring for my homelab. A push to main runs through a CI gate
on a self-hosted runner and deploys with no manual steps, as a non-root user
with no sudo anywhere in the pipeline. A Go health daemon polls every service
and pings Slack and Discord when something goes down or comes back.

"Alerting proven with real fault-injection testing" was the short version of
[the failure drill](/homelab/#failure-drill). I broke a live service on purpose,
five times, and timed the alerts: 8 of the 10 down/up transitions alerted, at
5.7 seconds on average against a 10-second poll.

The two misses were the interesting bit. A recovery and the next failure
landed 5.1 seconds apart, inside a single poll, so the daemon never saw either.
Polling can't catch a flap faster than its own interval. The
[write-up](https://github.com/iamzainrizwan/s3ntry/blob/main/incidents/failure-test-2026-09-20.md)
has the details, and the [script](https://github.com/iamzainrizwan/s3ntry/blob/main/automation/failure-test.sh)
if you want to run it yourself.

## alexandria

The [server](/homelab/) all of this runs on, named after the library: if
you're going to hoard knowledge, commit to the bit. Ubuntu Server, with 1337,
s3ntry and re::curse, plus a Dockerised *arr stack and Jellyfin, all behind
nginx.

## KCL CyberSoc and year 2

I'm the Cyber Security Society's treasurer now, which means the termly budget,
plus inter-university CTFs (SIGINT included). The motto is "pwn others and
don't pwn yourself".

And I'm into year 2 at King's, after a first year that averaged 79.6%.

## Toronto!

I went to Toronto. That's the whole entry.

## Next

Applications: summer 2027 internships, 2027/28 placements, and anything else
that needs fixing (or is bound to). I'm in London and happy to relocate. If
that's you, my [email](mailto:iamzainrizwan@gmail.com) is open.
