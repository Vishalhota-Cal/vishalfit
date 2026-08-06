# VISHALXFIT — Train. Fuel. Peak.

A complete AI-powered bodybuilding operating system: nutrition tracking (with
Indian food + an AI parser), a workout program builder, a live workout
execution mode, a weekly training checklist, and progress tracking. Runs
entirely on your own laptop — a real local backend, a real local database,
no cloud account, no monthly cost.

## Architecture

This grew from a single-file browser app into a real client/server app:

```
index.html            — the frontend. Talks to the backend over fetch(), nothing else.
sw.js                  — service worker; caches the static shell for offline use,
                         NEVER caches /api/* (that's always live data).
manifest.webmanifest   — home-screen install metadata.
fonts/, icon-*.png     — self-hosted assets (offline-safe, no Google Fonts).
start-vishal7.command  — the launcher. ALWAYS use this to open the app.
server/                — Node/Express backend
  index.js               — serves the frontend + mounts the API
  db/                     — SQLite (Node's built-in node:sqlite — no native
                            compile step) + the migration/sanitizer logic
  services/               — the actual business logic, framework-free:
    referenceData.js        exercise + food library, phase presets, meal slots
    nutritionService.js     macro/fiber totals, diet-log read/write
    foodParserService.js    turns a raw AI response into logged food entries
    aiService.js             the ONLY place that calls OpenAI
    workoutProgramService.js program/day/exercise CRUD + weekly checklist math
    workoutSessionService.js the live "Start Workout" session
  routes/                 thin HTTP wrappers over the services above
  test/                   node --test unit tests for the service layer
data/
  vishalxfit.db         — the whole database. One file. Back it up like any file.
```

## Run it

**Always double-click `start-vishal7.command`.** First run installs the
server's dependencies and creates `server/.env` for you automatically. It
then starts the backend on a fixed local port and opens the app in your
browser.

Because there's now a real server behind this app, **the app does not work
at all if that server isn't running** — there's no browser-only fallback
anymore. If a page looks broken or won't save, the server probably isn't up;
run the launcher again.

## The AI food estimator

Type a whole meal in plain English — *"4 rotis + dal 250g"*, *"chicken
biryani 300 grams"*, *"3 eggs + oats 100g"* — on the **Quick Log (AI)** card
on the Fuel tab. It identifies each distinct food item, estimates calories,
protein, carbs, fat, and fiber for the quantity described, and **logs it
immediately** — no review step, by design. If something looks off, fix or
delete it afterward in the food log, same as you would a manually mistyped
entry.

**Your OpenAI key lives in `server/.env`**, not the browser — copy
`server/.env.example` to `server/.env` and paste your key in
(`OPENAI_API_KEY=...`), then restart the server. Because the key never
reaches the browser, this is the one part of the app that's already
sharing-safe from a key-leak standpoint. It's still your personal key making
real API calls — set a spend limit in the OpenAI dashboard.

## Workout programs, Start Workout, and the weekly checklist

**Train → the gear icon → Build New Program.** Name it, turn on the days you
train, name each day's split, and add exercise templates (target sets,
reps, weight, rest, notes). Activate it.

Once a program is active, the Train tab and the Dashboard both show a
**Start Workout** button on any day the program schedules something you
haven't logged yet. Starting a session opens a live view: current exercise,
target sets/reps, a running duration that's correct even if you close the
laptop mid-workout (it's computed from the moment you started, not a
counter that can drift or get lost), a way to log each set, move between
exercises, add an exercise you didn't plan for, and finish or discard the
session. Finishing writes a normal entry into your workout history.

The **weekly checklist** on the Train tab is computed from your active
program plus your logged workouts — rest days aren't held against your
completion percentage, and any workout logged that day counts as done
whether or not it was started through "Start Workout."

## Your data

Everything lives in `data/vishalxfit.db` — one SQLite file. Nothing is
uploaded anywhere.

**Back up regularly.** Settings (gear icon, top right) → **Export Backup**
produces one `.json` file with everything, including your photos.
**Restore from Backup** replaces everything currently in the app with that
file's contents — it's a full restore, not a merge, so it asks you to
confirm first.

## Testing

```
cd server
npm test
```

Runs the service-layer unit tests (`node --test`, no extra dependencies) —
nutrition totals, the AI food-parser's item-splitting, the weekly-checklist
math, and the workout-session duration/state logic. Rendering and the
browser UI stay manually verified in-browser, same as before; that class of
testing doesn't benefit from new tooling here.

## Where to look in the code

- `server/db/db.js` — the only file that runs raw SQL.
- `server/services/*.js` — all business logic, and all unit-tested; no I/O
  inside these, which is what makes them testable without a real database.
- `index.html` → `apiGet`/`apiSend`/`loadKey`/`saveKey` — the frontend's one
  and only path to the backend.
- `index.html` → `renderGauge7()` / `.gauge7` — the FST-7 seven-set pump
  gauge, the app's signature visual (still there, unchanged by any of this).
