---
title: Summer 2026, in review
date: 2026-09-26
description: A hackathon, four things I built and still use, a server that watches itself, and Toronto. The long version of my LinkedIn post.
---

I posted a shortened version of this on LinkedIn, because I didn't like the idea of cluttering everyone's feeds with a huge wall of text just seemed kinda selfish. Here's the long version. 

## Google Student AI Hackathon

Fifty students were picked from nearly a thousand applicants, and I was one of them. A team of six of us built [Sherpa](/projects/#project-sherpa), an AI-powered career dashboard for students: a guidance chat built on Gemini, CV scoring CV rewrite and LaTeX auto-formatting with rewrite suggestions, and social application tracking.

My parts was the "Generate updated CV" feature, which takes the original CV, renderers it in a LaTeX template, and I also had a  hand in markdown rendering for Gemini's replies, fixing auth and upload failures, and demoing the whole thing live on stage.

## 1337

Ever heard of Anki? The main idea is that it takes your flashcards, and uses a spaced-repetition algorithm to try and beat [Ebbinghaus' forgetting curve](https://en.wikipedia.org/wiki/Forgetting_curve). I thought to do the same for the [NeetCode 150](https://neetcode.io/practice), because I wanted to get into LeetCode but had no idea where to start. 

It has two parts - its tracker and dashboard, where it shows the problems I've got scheduled next, the ones I'm due to do coming up, and my overall progress; and the second part, that automatically emails me a digest of overdue problems every morning. 

It's mostly built with Claude Code, and is now the tool I use almost rail, rather than a simple portfolio piece. Two rules do most of the work: "struggled " sends a problem back to a review tomorrow instead of moving its review further away, and gaps count from the day I actually reviewed a problem, so a late review shifts the next ones further out instead of having a risk of them landing close to each other and ruining my workload. [More on the projects page](/projects/#project-1337).

## re::curse

Interview prep by email. Every day it has Gemini write a set of questions, keep them in SQLite, and sends the questions at 11:00 and the solutions at 23:00. It can read my CV and tailor the conceptual question to a project on it,

## ledgr

My attempt at a [finance ledger](/projects/#project-ledgr), built the way accounting software is. It reals my real bank statements (HSBC PDFs, Revolut exports), checks each one before its own printed totals before posting anything, and turns every transaction into balanced double-entry lines. 

I mentioned posts were "idempotent" in the LinkedIn post. That means that every posting carries its own external ID, so importing the same statement twice never counts those transactions twice. Entries are never editer or delete either; a mistake gets a reversal instead. There's a [live demo](https://ledgr-demo.fly.dev/) if you wanna go throw a mock statement at it. 

## s3ntry

I used to manually SSH in and `git pull` my work from its repo. [s3ntry](/projects/#project-s3ntry) was made to fix that, and add more. 

I started with a deploy pipeline, documenting each step to set up on a new project. A push to main runs through a CI gate on a self-hosted runner with no manual steps, as a non-root user with no sudo anywhere in the pipeline. A Go health demon polls every service and pings Slack and Discord when something goes down or comes back. 

"Alerting proven with real fault-injection testing" was the short version of [the failure drill](/homelab/#failure-drill). I broke a live service on purpose, five times, and times the alrets: 8 of the 10 down/up transitions alerted, at 5.7 seconds on average against the 10 second poll. 

The two misses were what really interested me. After investigating, I saw that the recovery and the next failure landed 5.1 seconds apart, being within a single poll, so the daemon never saw either. Polling can't catch a flap faster than its own interval. The [writeup](https://github.com/iamzainrizwan/s3ntry/blob/main/incidents/failure-test-2026-09-20.md) has the details, and the [script](https://github.com/iamzainrizwan/s3ntry/blob/main/automation/failure-test.sh) if you wanna run it yourself. 

## alexandria

The [server](/homelab/) all of this runs on, named after the library: if
> you're going to hoard knowledge, commit to the bit. 

Ubuntu Server, with 1337, s3ntry and re::curse, plus a Dockerised *arr stack and Jellyfin, all behind nginx.

## KCL CyberSoc and year 2

I'm the Cyber Security Society's treasurer now, which means the termly budget,
plus inter-university CTFs (SIGINT included). The motto is "pwn others and
don't pwn yourself".

And I'm into year 2 at King's, after a first year that averaged **79.6%** and a score of **97** in Data Structures. 

## Toronto!

I went to Toronto. That's the whole entry.

## Next

Applications: summer 2027 internships, 2027/28 placements, and anything else
that needs fixing (or is bound to). I'm in London and happy to relocate. If
that's you, my [email](mailto:iamzainrizwan@gmail.com) is open.
