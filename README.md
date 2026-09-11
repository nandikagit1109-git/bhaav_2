<<<<<<< HEAD
# bhaav_2
=======
<div align="center">

# Bhaav <span style="font-weight:300">(भाव)</span>

**Write normally. We'll tell you what your hands already know.**

A passive self-awareness tool that notices changes in *how* you write — never *what* you write.

[Live demo flow](#running-locally) · [Architecture](#architecture) · [Privacy model](#the-privacy-model) · [API](#api-surface)

</div>

---

## The idea

Every mental-health tracker asks you to perform your distress: rate your mood, fill in a check-in, tell a chatbot what's wrong. Most people won't — especially the ones who need it most.

**Bhaav starts somewhere simpler.** You're already writing — journals, notes, essays. Buried in that ordinary activity is a behavioural signal that tends to shift when something internal shifts: *rhythm*. Not what you type — the timing underneath it.

Bhaav learns what "normal" looks like **for you** — your typing speed, your pause patterns, your corrections — and quietly notices when a session moves away from your own baseline. No mood ratings. No diagnosis. No one else's data touching yours. Just: *"something looked a little different"* — and the choice of what to do next stays entirely yours.

```
write  →  behaviour captured  →  personal baseline  →  deviation  →  insight  →  you decide
```

## What it measures

Five aggregate features, extracted **in the browser** from keystroke *timing only*:

| Feature | What it captures |
|---|---|
| `typingSpeed` | Gross pace (WPM) over the session |
| `meanPauseMs` | Average length of thinking pauses (>500 ms) |
| `pauseStdDevMs` | How regular those pauses are |
| `correctionRate` | Share of keystrokes that are deletions |
| `timingVariance` | Coefficient of variation of all inter-key intervals |

The signature visual — **The Line You Walk** — renders this rhythm live as an animated ink line: consistent typing draws a smooth stroke, rapid bursts add energy, long pauses rest the line. The same line reappears as the dashboard trend, the session result, and the campus aggregate. One visual system, one idea.

## Architecture

```
┌───────────────────────────── CLIENT ─────────────────────────────┐
│  React 18 · Vite · Tailwind v4 · Framer Motion · Recharts        │
│                                                                  │
│  useKeystrokeTelemetry  →  records { timestamp, isCorrection }   │
│         (the character itself is discarded at this boundary)     │
│                            ↓                                     │
│  lib/featureExtraction.js  →  pure functions, unit-tested        │
│         ↓ features only — journal text NEVER leaves the tab      │
└──────────────────────────────┬───────────────────────────────────┘
                               │  POST /api/sessions (JSON, ≤32kb)
┌──────────────────────────── SERVER ──────────────────────────────┐
│  Node + Express · sql.js (embedded SQLite)                       │
│                                                                  │
│  validate.js    rejects any payload containing text-like fields  │
│  stats.js       baseline (mean ± SD per feature, n ≥ 6)          │
│                 score → RMS of z-scores across the 5 features    │
│  insights.js    Anthropic insight with hard guardrails +         │
│                 deterministic fallback when the API is absent    │
│  campusAggregate  k-anonymised weekly trend (≥ 10 participants)  │
└──────────────────────────────────────────────────────────────────┘
```

**Stack:** Node 18+ (ESM), Express, sql.js · React 18, Vite 5, Tailwind CSS v4, framer-motion, Recharts, vitest.

**Key files**

| Path | Role |
|---|---|
| `client/src/lib/featureExtraction.js` | Pure keystroke→feature math (no DOM, fully tested) |
| `client/src/hooks/useKeystrokeTelemetry.js` | Session capture; guarantees zero character retention |
| `server/src/validate.js` | Rejects text-bearing payloads before they reach the DB |
| `server/src/stats.js` | Baseline building, z-score deviation scoring, campus aggregation |
| `server/src/insights.js` | Guardrailed LLM insight + deterministic fallback |
| `server/src/db.js` | Embedded SQLite schema (no text columns exist at all) |

## The privacy model

Privacy here isn't a policy — it's enforced at three layers:

1. **The client records almost nothing.** The telemetry buffer holds `{ timestamp, isCorrection }` pairs and nothing else; the key value is discarded the moment the event fires, and the buffer is wiped when a session ends. Raw keystroke sequences are never persisted anywhere, even in memory.
2. **The server physically cannot store text.** `validate.js` rejects any request containing text-like fields (`text`, `content`, `journal`, `keystrokes`, `clipboard`, …) with a `400`, and the `sessions` table has no column that could hold prose. Every numeric feature is bounds-checked and clamped.
3. **The LLM never sees content.** Weekly insights are generated from aggregate statistics only, wrapped in a non-clinical prompt with a banned-term filter (diagnosis language is rejected and the deterministic fallback used instead). No API key? The product stays complete — `fallbackInsight()` derives the same editorial copy from the actual deviation metrics.

**Stored:** typing speed, pause patterns, correction rate, timing variability, session timing, rhythm deviation, support preferences.
**Never stored:** journal text, individual characters, clipboard contents, passwords, anything from other apps.

**Campus Pulse** aggregates opted-in sessions into a weekly trend and is served only when **≥ 10 participants** (`MIN_GROUP_SIZE`, k-anonymity). Below the floor the endpoint returns `403 withheld` — individuals remain invisible by construction, not by promise.

You can **export** everything Bhaav knows about you (`GET /api/export`, clearly marked `containsJournalText: false`) or **delete** it all (`DELETE /api/me`) at any time.

## Running locally

**Prerequisites:** Node 18+, npm. No database server, no API key required.

**Quick start (Windows):**

```powershell
.\run-bhaav.ps1
```

That installs dependencies, seeds a 12-session demo trajectory, starts both servers, and opens the browser.

**Manual (any OS):**

```bash
# 1. Backend  → http://localhost:8787
cd server
npm install
npm run seed        # optional: 12-session demo trajectory
npm run dev

# 2. Frontend → http://localhost:5173
cd client
npm install
npm run dev
```

Optional: copy `.env.example` to `.env` and add an `ANTHROPIC_API_KEY` for AI-written insights. Without it, Bhaav uses its deterministic fallback — the demo works fully either way.

| Script (repo root) | What it does |
|---|---|
| `npm run dev` | Backend + frontend together (concurrently) |
| `npm run seed` | Seed the demo trajectory |
| `npm test` | Server (`node --test`) + client (vitest) suites |
| `npm run lint` | Syntax/lint checks for both sides |
| `npm run build` | Production client bundle |

## API surface

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness + `storesJournalText: false` |
| `GET` | `/api/state` | Full app state: sessions, baseline, insight, settings |
| `POST` | `/api/sessions` | Submit behavioural features → scored deviation |
| `POST` | `/api/insights/weekly` | Weekly editorial insight (guardrailed LLM or fallback) |
| `POST` | `/api/feedback` | "Did that make a difference?" loop |
| `PUT` | `/api/settings` | Support level, trusted contact, campus opt-in |
| `GET` | `/api/campus` | k-anonymised aggregate (403 below the privacy floor) |
| `GET` | `/api/export` | Download everything stored about you |
| `DELETE` | `/api/me` | Delete everything stored about you |

## What Bhaav deliberately doesn't do

- **No diagnosis, ever.** Deviations are observations, not assessments. The copy, the prompt guardrails, and the banned-term filter all enforce this.
- **No mood ratings, no check-ins.** The magic is in *not asking*.
- **No cross-user comparison.** Your baseline is yours alone; Campus Pulse only ever shows aggregate direction, never individuals.
- **No engagement traps.** No streaks, badges, or feeds. Write → notice → choose.

---

*Bhaav doesn't tell you how to feel. It helps you notice your own pattern.*
>>>>>>> bf22f5c (Add product README and .env.example)
