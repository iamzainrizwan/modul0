---
title: Didn't we already have AI?
date: 2026-11-07
description: I got an Echo Dot for my 12th birthday. Talking to it felt a lot like talking to ChatGPT, until it did something completely unhinged. So what was it actually doing?
---

For my 12th bday, I distinctly remember my parents taking me to John Lewis and buying me an Amazon Echo Dot. It still sits on my windowsill, all these years later, where it occasionally works for me as a speaker and alarm clock. 

Back then, it felt like the future. You talked to it with natural language, "Alexa, what's the tallest mountain in the world", "Alexa, what's the weather", and it understood you and then did the thing. To me that's... basically what some people do with ChatGPT nowadays? Except GPT is more informed, and according to some reports, the Echo went batshit insane more often than its modern cousin. 

So, the question that bugged me here, didn't we already have AI in 2018? The usage was basically the same, right? I looked into it, and here's what i found. 

## What happens when you say "Alexa"

It's a pipeline, with each stage having a different purpose. 

**1. The wake word.** The Dot doesn't send everything you say all the time to Amazon (despite what some conspiracy theories may think!) A small model on the device itself listens for a user-defined wake word from Amazon's fixed set - "Alexa","Amazon", "Echo", or "Computer" ([Amazon's own glossary](https://developer.amazon.com/en-US/alexa/alexa-skills-kit/key-terms#w)). Amazon's [2018 research](https://www.amazon.science/blog/alexa-scientists-present-two-new-techniques-that-improve-wake-word-performance) describes it as two stages: a neural network that flags anything that sounds like the word, and then a second classifier that throws out most of the false positives. Once it fires the light ring goes blue (to signify that Alexa was now listening for a prompt), and the audio after it streams to the cloud, where a bigger model checks the wake word again and can [cut the stream off] (https://www.digitaltrends.com/home/cloud-based-wake-word-verification-alexa-amazon/) if it decides it misheard.

**2. Speech to text, in the cloud.** Automatic speech recognition turns the audio into words, e.g. "turn the lights off".

**3. Text to intent.** This is the bit that felt like intelligence. Natural language understanding maps the sentence to an *intent* (the action: turn something off) and *slots* (its arguments: which thing). It's choosing from a menu.

**4. Routing to a skill.** Whoever built the feature wrote that menu. An Alexa skill comes with an [interaction model](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-the-interaction-model-for-your-skill.html): an invocation name ("Alexa, ask *Spotify* to..."), a list of intents, and *sample utterances*, the developer's own list of ways someone might phrase each request, like `turn off the {device}`. Alexa trains on those lists. Your sentence gets matched to one, packed into JSON and sent to the skill's backend (often an AWS Lambda function), which sends back some text.

**5. Text to speech.** The reply gets read out in Alexa's voice.

So the "understanding" lived almost entirely in step 3, and it was a classifier picking the closest option from lists people wrote by hand. If what you said didn't land on anything, you got "Sorry, I don't know that one", or Alexa went and read you a snippet off a web page. There was no reasoning in there, and barely any memory: once a request was handled, it was gone.

## So what was the random shit?

Once you know the pipeline, every famous Alexa disaster turns out to be one stage getting it wrong, with nothing behind it to notice.

**The laughing (2018).** In early 2018, people started reporting their Echos laughing at them, completely unprompted. Amazon's explanation was that Alexa could ["mistakenly hear the phrase 'Alexa, laugh'"](https://www.npr.org/sections/thetwo-way/2018/03/08/591831871/alexa-please-stop-laughing-amazon-says-its-fixing-device-s-unprompted-cackles). That's stages 1 to 3 misfiring in a row. The fix tells you a lot: they didn't make it understand better, they changed the trigger to the longer "Alexa, can you laugh?" and made it say "Sure, I can laugh" first. A longer phrase is harder to hear by accident.

**The recorded conversation (2018).** A family in Portland found out their Echo had recorded a private conversation and sent it to one of the husband's employees. Amazon's [account](https://www.engadget.com/2018/05/24/amazon-echo-record-conversation-and-sent-to-random-contact/) is a chain of misfires: a word in the background sounded like "Alexa" (stage 1), the next bit of conversation sounded like "send message" (stage 3), Alexa asked "To whom?", heard something in the background as a name from the contact list, asked to confirm, and heard "right". Every stage did its job in isolation. Nothing in the system could step back and go "these people are obviously not talking to me".

**The penny challenge (2021).** A 10-year-old asked her Echo for a challenge, and it told her to plug a charger halfway into a socket and touch a penny to the exposed prongs. The [quote came from a web page warning parents about the challenge](https://edition.cnn.com/2021/12/29/business/amazon-alexa-penny-plug-intl-scli/index.html), cut out of context. That was the "read a snippet off the web" fallback: it matched the words "challenge" without any idea what the words meant.

## So, did we already have AI?

Sort of, and the funny part is how much of the structure survived.

An intent with slots is basically what's now called a tool call: a function name and its arguments. When ChatGPT searches the web or Claude edits a file, the model is producing something like `search(query="...")`, and a normal program goes and runs it. The Echo had the same arrangement of a front end that listens, something in the middle that decides what you meant, and actions at the end. What changed is the middle. Instead of a classifier matching you against a developer's list of sample sentences, a language model reads everything you said (and what came before it and its own reasoning and your files and etc.) and writes the call itself. That's the difference between "Sorry, I don't know that one" and actually getting what you meant.

Amazon clearly agrees. In February 2025 it announced [Alexa+](https://www.macrumors.com/2025/02/26/amazon-debuts-alexa-plus-generative-ai/), rebuilt on large language models, free with Prime and $19.99 a month without it, a year and a half after it was first promised. That came after years of the old Alexa reportedly [losing Amazon billions](https://daringfireball.net/linked/2022/11/22/alexa-10-billion), with one former employee calling it "a colossal failure of imagination". Most Echos were sold at about cost, on the bet that people would shop by voice. They mostly didn't, apart from kids buying stuff on Alexa Games, and probably getting scolded by their parents for doing so. Don't ask how I know... :/

So no, I don't think we had AI, not in the way we mean it now. We had a really good ear, a menu, and a lot of people writing out every way you might ask for the lights. Would I use Alexa in that way again, now that I have other devices and AI at my fingertips? Not really. It's just a fancy alarm-clock-speaker thing that I can talk to instead of actually having to "do" the setting, which doesn't make it worth its original £50 price, but has probably been what stopped me from throwing it out all these years.
