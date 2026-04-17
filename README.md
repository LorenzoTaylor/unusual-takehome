# AI Content Optimization Tool

A single-session tool for B2B SaaS growth teams to optimize written content for AI visibility and understand exactly what changed and why.

## Setup

Prerequisites: Rust (stable), Node.js 18+, an Anthropic API key.

```bash
git clone <repo>
cd unusual-takehome
cp .env.example .env
# add your ANTHROPIC_API_KEY to .env

npm install
cd frontend && npm install && cd ..
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:8080

## What it does

Paste content or drop in a URL, specify your brand, target audience, and goal (increase visibility, reposition brand, expand market). Get back a streaming optimized version with structured reasoning for every change — what changed, why it changed, and how it serves the goal. Also surfaces what's still missing after the optimization.

## Methodology

Timebox was short so built it as a focused vertical slice. One strong workflow executed well, nothing else.

These didn't make the cut: auth, database, history, multi-model testing. Each has a clear production answer but none of them change how the core loop feels.

The prompt is the real product here. It forces the model to produce opinionated, non-generic changes tied to a specific strategic intent. Each change has a category (positioning, discoverability, differentiation, etc.), a reason, and a calibrated impact level. The model also surfaces missed opportunities — often more useful to a Head of Growth than the changes themselves.

## Technical decisions

**Rust.** The compiler is strict. When you're iterating fast on LLM output shapes and API integrations, code that compiles is almost always correct — no silent runtime failures while the model returns something unexpected.

**Prompt lives in a separate file, compiled in at build time.** The system prompt is in `backend/src/prompt.md` and pulled in via `include_str!`. Iterate on the prompt without touching any Rust code.

**Haiku during development, Sonnet for the final submission.** Haiku is fast and cheap for iterating on UI. Sonnet output quality is noticeably better on strategic reasoning — the change descriptions are sharper and missed opportunities are more specific.

**Mock mode.** `MOCK_OPTIMIZE=true` in `.env` returns hardcoded responses instantly without hitting the API. Frontend and backend could be developed completely independently, no API spend wasted on UI changes.

**Streaming via two-part output.** The model writes optimized content as plain text first, then a delimiter, then structured JSON. Content streams live to the user while the analysis arrives cleanly at the end — no partial JSON parsing, no waiting for the full response before showing anything.

**What I cut.** Auth, history, database, scoring, multi-model comparison. None of it changes how the core loop feels. The thing that matters to this user is: paste content, get back something better with clear reasoning for every change. Everything else has a clear production answer but earns nothing in a demo.

## What I'd build next

**Recommendation test** — after optimization, run a second call that simulates a real user query ("What tool would you recommend for X?") against both versions and shows whether the brand gets recommended more confidently. Closes the loop from "we think this is better" to "here's how an LLM actually responds to your content before and after." Lightweight version of what Unusual's core product does.

**Multi-model testing** — same simulation across GPT-4 and Gemini, not just Claude. Breaks the self-evaluation circularity and gives a cross-model signal.

**Brand voice guardrails** — set tone, terminology, and off-limits phrases once, applied across all optimizations.

**JS-rendered URL support** — Playwright or Puppeteer for pages that need a real browser to render.

**Real-time knowledge grounding** — models have a training cutoff so anything about a competitor's recent positioning, a new product launch, or a market shift is invisible to them. 