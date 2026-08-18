# VISHALXFIT — Train. Fuel. Peak.

A complete AI-powered bodybuilding operating system: nutrition tracking (with
Indian food + an AI parser), a workout program builder, a live workout
execution mode, a weekly training checklist, and progress tracking.

Runs two ways from the same code: **on your laptop** (Express + Supabase,
`start-vishal7.command`) or **deployed on Vercel** as an installable iPhone
PWA, backed by Supabase (Postgres + Storage). There is no more local-only
mode — your data always lives in Supabase, not in a file on one machine.

## Architecture

```
index.html            — the frontend. Talks to the backend over fetch(), nothing else.
sw.js                  — service worker; caches the static shell for offline use,
                         NEVER caches /api/* (that's always live data).
manifest.webmanifest   — home-screen install metadata.
login.html             — the interim password gate's login page (see "Access control").
middleware.js          — Vercel Routing Middleware: enforces the login gate on
                         EVERY request (static files included), at the edge.
fonts/, icon-*.png     — self-hosted assets (offline-safe, no Google Fonts).
start-vishal7.command  — the local launcher. ALWAYS use this to open the app locally.
package.json           — root: npm workspaces (server/) + Vercel-only deps. Not the app.
vercel.json            — routes /api/* to api/index.js; cache headers for sw.js/manifest.
api/index.js           — the one Vercel serverless function; wraps server/app.js.
server/                — Node/Express backend (same code locally and on Vercel)
  app.js                  builds the Express app — no app.listen() here
  index.js                local-only: app.listen(PORT) for start-vishal7.command
  middleware/user.js       attaches req.userId (fixed OWNER_USER_ID until real auth)
  lib/asyncRoute.js        wraps async route handlers so rejections hit the error handler
  db/                      Supabase client (Postgres + Storage) + the Postgres schema
  services/                the actual business logic, framework-free:
    referenceData.js        exercise + food library, phase presets, meal slots
    nutritionService.js     macro/fiber totals, diet-log read/write
    foodParserService.js    turns a raw AI response into logged food entries
    aiService.js             the ONLY place that calls OpenAI
    workoutProgramService.js program/day/exercise CRUD + weekly checklist math
    workoutSessionService.js the live "Start Workout" session
  routes/                 thin HTTP wrappers over the services above
  test/                   node --test unit tests for the service layer
scripts/
  migrate-to-supabase.js  one-time: copies your old local SQLite data into Supabase
```

## Your data lives in Supabase now

Every request is scoped to one `user_id` (see `server/middleware/user.js`),
even though today that's always a single fixed `OWNER_USER_ID` — the schema
(`server/db/schema.sql`) and every query were built multi-user-ready from day
one specifically so that adding real accounts later (see "Followers" below)
is a middleware swap, not a rewrite.

## First-time setup

You need a Supabase project and (to put this on your iPhone from anywhere,
not just your home Wi-Fi) a Vercel deployment. Both are free at this scale.

### 1. Create the Supabase project

1. [supabase.com](https://supabase.com) → New project. Pick any region close to you.
2. **SQL Editor** → paste the entire contents of `server/db/schema.sql` → Run.
   This creates the tables, the rev-tracking triggers, and the RPC functions
   the app calls. It does **not** run automatically — this is the one manual
   step per Supabase project.
3. **Storage** → New bucket → name it exactly `progress-photos` → **Private**.
4. **Settings → API** → copy the **Project URL** and the **service_role**
   key (not the `anon` key — the server needs the one that bypasses RLS).

### 2. Fill in `server/.env`

```
cd server
cp .env.example .env
```

Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and generate the rest:

```
node -e "console.log(crypto.randomUUID())"        # → OWNER_USER_ID
node -e "console.log(crypto.randomBytes(32).toString('hex'))"  # → SESSION_SECRET
```

Pick your own `APP_PASSWORD` (this is the gate standing between the internet
and your data until real accounts exist — see "Access control"). Add your
`OPENAI_API_KEY` if you want the AI food estimator.

### 3. If you have existing data (an old `data/vishalprime.db`)

```
cd server && npm install    # first time only
cd ..
node scripts/migrate-to-supabase.js
node scripts/migrate-to-supabase.js --verify   # confirms every key matches byte-for-byte
```

### 4. Run it locally

```
./start-vishal7.command
```

### 5. Deploy to Vercel

1. [vercel.com](https://vercel.com) → New Project → import
   `github.com/Vishalhota-Cal/VishalXfit`.
2. Framework preset: **Other** (no build step — it's static + one function).
3. Project → Settings → **Environment Variables** → add every name from
   `server/.env` (same values). This is the one place secrets live in
   production — never commit `.env`.
4. Deploy. Vercel gives you an `https://…vercel.app` URL.
5. On your iPhone: open that URL in **Safari** → Share → **Add to Home
   Screen**. It installs as a standalone app using the icons already in this
   repo.

## Access control (read this before deploying)

There is **no per-user login yet** — see "Followers" below for what that
looks like. Until then, the entire site sits behind one shared password,
enforced by `middleware.js` running at the edge in front of *every* request,
including static files — that's the only way to gate `index.html` itself,
since Express never sees CDN-served requests. Log in once at `/login.html`;
the session cookie lasts 90 days.

**This is not real per-account security.** Anyone with the password sees and
can edit everything under `OWNER_USER_ID` — fine for you alone or a small
circle you trust with that one password; not what you hand to the public
before the Followers phase below ships.

## The AI food estimator

Type a whole meal in plain English — *"4 rotis + dal 250g"*, *"chicken
biryani 300 grams"*, *"3 eggs + oats 100g"* — on the **Quick Log (AI)** card
on the Fuel tab. It identifies each distinct food item, estimates calories,
protein, carbs, fat, and fiber for the quantity described, and **logs it
immediately** — no review step, by design.

Your OpenAI key lives in `server/.env` locally, or as a Vercel environment
variable in production — never in the browser. It's still your personal key
making real API calls, shared across everyone using this deployment while
there's no per-user auth; set a spend limit in the OpenAI dashboard.

## Workout programs, Start Workout, and the weekly checklist

**Train → the gear icon → Build New Program.** Name it, turn on the days you
train, name each day's split, and add exercise templates (target sets,
reps, weight, rest, notes). Activate it.

Once a program is active, the Train tab and the Dashboard both show a
**Start Workout** button on any day the program schedules something you
haven't logged yet. Starting a session opens a live view: current exercise,
target sets/reps, a running duration that's correct even if you close the
app mid-workout (it's computed from the moment you started, not a counter
that can drift or get lost), a way to log each set, move between exercises,
add an exercise you didn't plan for, and finish or discard the session.

The **weekly checklist** on the Train tab is computed from your active
program plus your logged workouts — rest days aren't held against your
completion percentage, and any workout logged that day counts as done
whether or not it was started through "Start Workout."

## Backup & restore

Settings → **Export Backup** produces one `.json` file with everything —
photos are exported as Supabase Storage pointers now, not embedded bytes, so
the file stays small no matter how many progress photos you have. **Restore
from Backup** replaces everything currently in the app with that file's
contents — a full restore, not a merge — and asks you to confirm first.

## Testing

```
cd server
npm test
```

Runs the service-layer unit tests (`node --test`, no extra dependencies) —
nutrition totals, the AI food-parser's item-splitting, the weekly-checklist
math, and the workout-session duration/state logic. These are unaffected by
the Supabase migration by design (see `server/services/` below). Rendering
and the browser UI stay manually verified in-browser.

## Followers (future)

Today this is one account behind a shared password. Turning it into
something you hand out to followers means: Supabase Auth (Google +
email/password) replacing `server/middleware/user.js`'s fixed
`OWNER_USER_ID` with the verified signer's own id, and `middleware.js`
verifying a real session instead of the shared-password cookie. Because
every table and every query is already scoped by `user_id`, this is a
middleware + a signup screen, not a data model change. Also worth deciding
before that day: Vercel's free Hobby tier is personal/non-commercial use
only — monetizing means Pro (~$20/mo) — and the OpenAI key is currently
shared with no per-user quota.

## Where to look in the code

- `server/db/db.js` — the only file that talks to Supabase (Postgres + Storage).
- `server/db/schema.sql` — the Postgres DDL, RLS policies, and RPC functions.
  Run manually once per Supabase project; nothing executes this automatically.
- `server/services/*.js` — all business logic, and all unit-tested; no I/O
  inside these, which is what makes them testable without a real database.
- `index.html` → `apiGet`/`apiSend`/`loadKey`/`saveKey` — the frontend's one
  and only path to the backend.
- `index.html` → `renderGauge7()` / `.gauge7` — the FST-7 seven-set pump
  gauge, the app's signature visual.
- `middleware.js` — the interim access gate; the one thing to change when
  real auth lands.
