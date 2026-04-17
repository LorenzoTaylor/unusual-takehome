# AI Content Optimization Tool

## Setup

Prerequisites: Rust (stable), Node.js 18+, an Anthropic API key.

```bash
git clone <repo>
cd unusual-takehome
cp .env.example .env
# add your ANTHROPIC_API_KEY and OPENAI_API_KEY to .env

npm install
cd frontend && npm install && cd ..
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:8080

## What it does

Paste content or drop in a URL, add your brand one-liner, target audience, and goal. You get back a streaming rewrite with a breakdown of every change and why it was made. Missed opportunities show up at the end too. From there you can run the Dual Perspective Simulation: GPT-4o takes two roles, retrieval evaluator and recommendation assistant, and tells you whether the optimization actually changed how an LLM would respond to your content, and which signals drove the shift.

## Methodology

Built for B2B SaaS growth teams trying to control how AI systems talk about their brand. The output is opinionated and tied to a goal you pick before the model touches anything. Missed opportunities get called out explicitly because they're usually more useful than the changes.

Short timebox so I built one workflow and built it well. Auth, database, history all have obvious answers but none of them change what the thing actually feels like to use.

The prompt is the real product. It forces the model to make specific changes with real reasons, not rewrites that could apply to any company.

## Technical decisions

**Rust.** Iterating on LLM output formats and API integrations, code that compiles is almost always correct. No silent failures while the model returns something you didn't expect.

**Streaming via two-part output.** The model writes the rewrite as plain text, then a delimiter, then JSON. The rewrite streams live while the analysis parses cleanly at the end.

**What I cut.** Auth, history, database, scoring. None of it changes what the thing feels like to use.

## What I'd build next

**Dual Perspective Simulation across more models.** The simulation currently runs on GPT-4o only. Running the same retrieval and recommendation test across Gemini and Claude too would break the self-evaluation circularity and give a real cross-model signal on whether the optimization landed.

**Brand voice guardrails.** Define tone and off-limits phrases once, carry them through every optimization.

**JS-rendered URL support.** The current scraper breaks on anything that renders client-side. Playwright handles that, and it's also the right time to add SSRF hardening on the URL fetcher.

**Real-time knowledge grounding.** Models don't know anything past their training cutoff so competitor moves, product launches, market shifts are invisible. Plug in live search and the optimization is working from what's actually happening right now.
