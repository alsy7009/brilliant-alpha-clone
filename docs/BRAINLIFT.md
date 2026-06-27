# BrainLift — Building "Algebra Quest" (an AI-first Brilliant clone)

**Owner:** Amy Lin

**Purpose:** Document the AI-first build process and the point of view that drove it — an algebra learning app that optimizes for *durable learning through desirable difficulty*, not for the feeling of effortless progress that consumer edtech sells.

---

## 1. Tools & Workflow

- **Cursor + Claude (agentic coding)** as the primary build environment — used for end-to-end feature work: scaffolding the React/Vite + Firebase app, writing interactive SVG widgets, and wiring Firestore/Auth.
- **Workflow = spec-first, then vertical slices.** I had the AI write a PRD (MVP scope, persona, schema) first, then build one interactive lesson end-to-end before generalizing. Each feature was: describe intent → AI implements → I test in-browser → AI fixes.
- **AI as debugger + reviewer.** Pasted runtime errors, Firebase rule failures, and UX bugs back to the agent for root-cause fixes (e.g., duplicate-tile drag bug, account-linking auth flow, deploy/Node-version issues).
- **OpenAI via a Firebase Cloud Function** (key kept server-side) powers *content generation only* — drills and the Boss quiz — not conversation.

## 2. Prompting Strategies (what worked)

1. **"Build the JSON content engine before the UI."** Defining lessons as typed JSON (`steps`, `widgetConfig`, `validationRules`, `explanations`) let the AI generate new interactive lessons by filling a schema instead of writing bespoke components each time.
2. **"Generate the parameters, but compute every answer in code."** For AI drills I had the model propose *problem numbers* only; answers, tile banks, and distractors are computed deterministically client-side — so AI variety never produces a wrong/unsolvable problem.
3. **"Make feedback escalate and never reveal the answer until the 3rd miss."** Prompting for per-slot correctness + concept nudge → directional hint → full reveal produced constructive, specific hints instead of generic "try again."
4. **"Interleave the question types; same topic never back-to-back."** Asking for a mixed/shuffled set (plus a client-side apportionment pass) directly encoded interleaving into generation.
5. **"Show, don't tell, in the widget."** Iterative visual prompts ("draw the variable as a labeled block + individual unit blocks," "animate blocks flying off when subtracting") turned abstract algebra into manipulable objects.

## 3. Phase Decisions (chosen vs skipped)

- **Skipped: the AI chatbot tutor.** Everyone ships a chatbot, and an always-available conversational helper lets kids offload the struggle. Removing it keeps the productive-failure loop intact.
- **Chosen: hard-coded, specific, non-revealing hints** (escalating scaffolds) — constructive guidance that respects **desirable difficulty** and Hattie's "where to next" feed-forward.
- **Chosen: AI-generated drills** with **topic selection** (autonomy) and a **Recommended review weighted by past mistakes**, all **interleaved** — because interleaving and retrieval practice produce durable math learning.
- **Chosen: a 15-question "Boss Level"** mixed quiz that scores and rewards, as a retrieval/interleaving checkpoint.
- **Chosen: deliberately *not* a hyper-polished, frictionless UI.** Gamified, challenge-framed language and interface signal effort, not ease — again, desirable difficulty.

## 4. Code Analysis (rough split)

- **~85–90% AI-generated, ~10–15% human-authored.** Nearly all React components, SVG widgets, validation engine, Firebase wiring, and CSS were AI-written.
- **Human contribution was direction, not typing:** product decisions, learning-science framing, math/pedagogy correctness checks, UX iteration, and accept/reject on every change. The deterministic-answer rule and the "no chatbot / desirable-difficulty" stance were human calls that shaped the architecture.

## 5. Key Learnings (spiky insights)

- AI is most reliable when it generates *structured parameters into a hand-written validator*, not free-form truth — the schema is the guardrail.
- The hardest part of an "AI learning app" isn't the AI; it's *deciding what not to automate*. Removing the chatbot was a feature.
- A smoother UX is not a better learning product. The struggle is the point.

---

## DOK 2 — Summary

Algebra Quest inverts the consumer-edtech playbook. The same mechanics that make apps like Brilliant *feel* great — instant answer reveals, heavy scaffolds, blocked single-topic practice, an ever-present AI helper — are exactly the conditions learning science flags as producing **fluency illusions** rather than retention. So this build keeps the genuinely science-backed pieces (puzzle-/manipulation-first widgets, one concept per screen, gamification tied to learning *actions*) and deliberately adds back the "harder but better" mechanics most apps defer: **interleaved practice**, **retrieval checkpoints** (drills + Boss quiz), **mistake-driven review**, and **escalating hints that withhold the answer**. The bet is that a product optimized for effortful, durable learning beats one optimized for session metrics.

## DOK 3 — Insights

Building this clone surfaced a clear pattern: every easy, satisfying choice is usually the wrong one for memory. I removed the AI chatbot not because it's hard to build but because it's everywhere and it lets learners skip the struggle that consolidates knowledge — kids should sit in difficulty long enough to actually learn. In its place I built a feedback system that gives *specific, constructive* hints tied to exactly what the learner got wrong, escalating across attempts and never revealing the full answer until they've genuinely wrestled with it — a direct application of **desirable difficulty** and **feed-forward** feedback. I also chose not to chase a glossy, frictionless interface; instead the app uses challenge-framed, gamified language so the experience *feels* like a test of skill, reinforcing effort over ease. Finally, the AI is pointed at the highest-leverage retrofit: generating **interleaved** drills the learner can target by topic or have **recommended from past mistakes**, because shuffling problem types (not blocking them) is what drills knowledge in for the long term. Together these decisions treat "feels harder" as a design *goal*, not a bug.

## DOK 4 — Spiky POV

**Every edtech app on the market is engineered for an aesthetic, satisfying user experience — with no interleaving and no desirable difficulty — specifically to boost website/engagement metrics and hook users on the *feeling* of interacting with a slick UI, rather than on truly struggling and learning.** The polish that wins retention dashboards is the same polish that manufactures a false sense of mastery. A genuinely better learning product should feel harder, withhold answers, shuffle problem types, and reward attempts — even at the cost of looking less smooth — because the struggle is where the learning actually happens.

---

## Selected DOK 1 — Facts that ground this POV (from the source BrainLift)

- **Active learning:** Brilliant's core loop uses interactive visual widgets instead of passive video; the "Aha! Flow" presents the puzzle before the formula (manipulate first, see the principle after). (Brilliant.org — https://brilliant.org)
- **Interleaving:** Interleaving different problem types beats blocked practice for math — it forces learners to choose a strategy, feels harder, but yields better test performance. (Rohrer & Taylor, 2007 — https://doi.org/10.1007/s11251-007-9015-8)
- **Retrieval practice:** Effortful retrieval produces stronger, more durable memory than re-reading; low-stakes quizzing works as well as high-stakes. (Roediger & Karpicke, 2006 — https://doi.org/10.1111/j.1467-9280.2006.01693.x)
- **Desirable difficulties:** Conditions that slow short-term acquisition improve long-term retention/transfer; learners systematically prefer methods that feel effective but learn worse. (Bjork, 1994 — https://bjorklab.psych.ucla.edu/research/#difficulties)
- **Productive failure / pretrieval:** Attempting (and erring) before instruction beats instruction-first on delayed transfer; struggle prepares the mind for the answer. (Kapur, 2016 — https://doi.org/10.1080/00461520.2016.1155457; Carl Hendrick — https://www.carlhendrick.com)
- **Feedback:** The best feedback answers "where to next" (feed-forward); delayed feedback / not immediately revealing answers aids long-term retention. (Hattie & Timperley, 2007 — https://doi.org/10.3102/003465430298487; Bjork, 1994 — https://bjorklab.psych.ucla.edu/research/#difficulties)
- **Gamification:** Effects are stronger when game elements are tied to *learning actions*; points/badges bolted on are weak — goals, challenge, and feedback loops drive results. (Sailer & Homner, 2020 — https://doi.org/10.1007/s10648-019-09498-w)
- **Motivation:** Achievement leads to motivation, not the reverse — small early wins build intrinsic drive; rewarding *attempts* supports the productive-failure loop. (Carl Hendrick — https://www.carlhendrick.com; Ryan & Deci, 2000 — https://doi.org/10.1037/0003-066X.55.1.68)
