# ActiveLearn

**Subject: Algebra — Visual Equation Balancing**

ActiveLearn is a Brilliant-style learn-by-doing web app for middle school learners. Users isolate variables by manipulating a balance-scale simulation, get instant handwritten feedback, and progress through a linear algebra course.

Built for **Phase 1 MVP** (no AI): interactive lessons, persistence, auth, streaks, and mobile-first UI.

## Persona

Alex, a middle school student who needs visual intuition and short daily practice sessions—not video lectures.

## Stack

- **Frontend:** React + TypeScript + Vite, inline SVG, plain CSS
- **Backend:** Firebase Auth, Cloud Firestore, Firebase Hosting
- **No AI** in Phase 1 (per project requirements)

## Quick start

```bash
npm install
cp .env.example .env   # optional — fill in Firebase credentials
npm run dev
```

Without Firebase credentials, tap **Continue in demo mode** on the login screen. Progress saves to `localStorage`.

### Firebase setup

**Full guide:** [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

1. Create a Firebase project and enable **Email/Password** + **Google** auth providers.
2. Create a Firestore database.
3. Copy web app config into `.env` (see `.env.example`).
4. Restart dev server: `npm run dev`
5. Deploy rules: `firebase deploy --only firestore:rules`
6. Build and deploy hosting: `npm run build && firebase deploy --only hosting`

## Course (6 lessons)

| # | Lesson | Widget types |
|---|--------|----------------|
| 1 | Intro to Equation Scales | Balance scale |
| 2 | Constructing Expressions | Tile drag (alg_eq1 style) |
| 3 | Evaluating Expressions | Substitution (alg_eq2 style) |
| 4 | Graphing Linear Equations | SVG line graph, intercepts |
| 5 | The FOIL Method | Explanation slides + drag factors |
| 6 | Quadratic Graphs | Pick matching parabola |

Lessons unlock sequentially on the roadmap after completing the prior lesson.

```
src/content/          Lesson JSON (structured steps, not HTML blobs)
src/components/       EquationScale SVG widget, LessonPlayer, Roadmap
src/lib/              Firebase, auth, progress, validation engine
```

**Data flow:** Lesson JSON → step renderer → client validation (<100ms) → async Firestore `user_progress` write on correct answers.

## MVP testing (matches submission rubric)

1. Complete lesson 1 end-to-end, get problems wrong, use feedback to recover.
2. Drag/tap the scale and watch it tilt in real time.
3. Leave mid-lesson, return — progress and streak persist.
4. Finish lesson 1 — lesson 2 unlocks on the roadmap.
5. Works on phone-sized viewport with touch input.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Phase roadmap

- **Phase 1 (MVP):** This repo — hand-built interactive algebra lessons
- **Phase 2:** AI features (hints, problem generation) — AI-off fallback required
- **Phase 3:** Learning science (spaced repetition, interleaving, mastery signals)
