# ARC — Every Day Writes Your Story

**ARC 1.1 · Operation Power-Up** adds offline Training and Fuel to the existing React/TypeScript Academy PWA. The black-and-crimson interface, local IndexedDB storage, Academy attendance calculations, subject identities, clinical postings and existing daily habits are preserved.

This is a **feature-branch review**, not a production release. Do not merge or deploy this branch until the owner has reviewed it. The currently installed Academy 1.0 is unaffected by this source branch. No personal records are included in source control.

## Training

- One-tap completed gym, football, running and recovery/rest logs; optional details and notes.
- Workout completion checkboxes; optional exercises with their own checkboxes, sets, repetitions and weight.
- Editable Monday–Sunday goals; sports starts at one day/week. Multiple sessions on one day count once toward a day goal.
- Monthly active/rest days, completed sessions, recorded minutes and running distance; month selector and activity chart.
- Edit/delete Training logs with confirmation for deletion.
- Shared optional body-weight, sleep, energy and digestion check-ins. Saving a check-in replaces that date's values; blanks remain unknown.
- Eight-week body-weight graph: averages of recorded weights, with gaps for unrecorded weeks.

Training is intentionally separate from Academy's original Study/Gym/Sport habits. It does not infer old workouts from a checked Academy habit or rewrite any saved Academy day.

## Fuel

- Breakfast, lunch, dinner and snack item logging, including unknown PG meals.
- An offline reference set of 11 foods commonly available in India, with explicit household portion assumptions, calories, protein, fibre, calcium, iron, vitamin C and B12.
- Eggs, glasses, bowls, plates, handfuls and packets; confirm that the portion matches before a quantity is estimated. Unknown quantities and nutrients stay unknown, never silently become zero.
- Custom foods and favourite PG meals, with optional per-serving label/recipe nutrition. Saved meal snapshots stay independent of future food edits.
- Editable protein planning target, dietary preference, food exclusions, weekly grocery budget, per-suggestion price limit and reliable shared-fridge access.
- Known daily nutrition subtotals and weekly protein chart; incomplete data are labelled.
- Seasonal fruit rotation, shopping checklist with editable estimated prices and explicit manual weekly reset.
- MINI STASH inventory: shelf/fridge location, entered quantities and optional expiry/use-by dates. Expiry reminders are visible while ARC is open.
- Body-weight graphs and optional energy/digestion check-ins shared with Training.

The PG menu starts unknown. A plate of mixed PG food is never assigned invented nutrition. Local recipes and milk types can differ from reference foods. Documentation, full food source table and reference limitations are included offline under GHOST's source details, and in [docs/NUTRITION_SOURCES.md](docs/NUTRITION_SOURCES.md).

## GHOST // NUTRI-Sense foundation

An offline rule engine compares each supported nutrient separately. It considers an estimated gap only when the day is explicitly marked fully logged and every item has a known quantity and that nutrient. Otherwise it reports **insufficient data**. Adding, editing or deleting food reopens the day's completeness marker.

Suggestions explain why a food could help. They filter by recorded gaps, diet, exclusions, reliable fridge access and entered budget estimates. Missing prices on purchased items prevent affordability recommendations. Each option fits individually; several combined may exceed the budget. Planning prices are examples, not live Warangal market quotes.

Reference markers are general adult comparison points, not personalized requirements. A daily estimated gap cannot diagnose a medical deficiency, and meeting a reference does not establish adequacy. No expensive chatbot, internet nutrition API, account, telemetry or paid service is used. Nutrients beyond the documented set are not assessed.

## Academy stays operational

All existing Academy features remain available:

- Today: timetable-generated or manual lectures, practicals and clinical sessions; independent Attended/Absent/Cancelled/Not recorded marks, original habits and notes; explicit SAVE DAY.
- Separate subject/type and clinical department/rotation statistics, attendance register, CSV export and what-if simulator.
- Monthly calendar, past-date correction and REWIND of the latest 100 day saves.
- Configurable academic years, subjects, timetable effective dates, departments, rotations, holidays, cancellations and special working days.
- Validated JSON backup/import, installation guidance and storage protection request.
- Offline PWA shell, safe update prompt, standalone manifest and original install icons.

Attendance remains `attended / (attended + absent) × 100`. Cancelled, unrecorded and unsaved days are excluded. Changing a schedule or subject name does not rewrite saved snapshots. Default academic dates and attendance targets are editable planning placeholders; confirm your college's rules. Default subjects remain Pharmacology, Microbiology and Pathology.

## Local review — no deployment

Use Node.js 22 LTS or a newer supported version:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

If Chromium is already available in this Linux environment:

```sh
ARC_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

To review the production build locally:

```sh
npm run preview
```

Open `http://localhost:4173/arc-life-os/`, wait for **Offline ready**, then disconnect the browser and test saving/reopening. `npm run dev` starts an editing server on a separate port. Ports and origins have separate storage. Do not use the existing production address as a feature-branch preview. An ordinary unencrypted LAN address does not provide PWA service workers on iPhone.

Tests use synthetic data in isolated browser contexts. See [docs/POWER_UP_REVIEW.md](docs/POWER_UP_REVIEW.md) for verification results and the morning review checklist. Chromium phone emulation is not physical iPhone/Safari certification.

The existing GitHub workflow verifies pull requests into main and does not deploy PRs. This branch does not change that workflow. Do not invoke a deployment workflow or merge the PR during review.

## Data safety and compatibility

The IndexedDB database is still **`arc-academy`, database version 1, object store `state`, key `main`**. No new store or destructive database upgrade is needed. The serialized application schema is now **3**, with pure sequential migrations **1 → 2 → 3**. The migration adds empty modules without converting Academy habit checkboxes or changing Academy snapshots, revisions or IDs.

- Reads validate and migrate in memory; they do not overwrite stored legacy data. A later successful save writes the complete validated state in one atomic transaction.
- Current-schema missing/damaged modules and unknown future schemas are rejected. Failures show recovery errors rather than a new blank app.
- Saving validates both the proposed state and any existing record. Stale-tab conflicts, interrupted transactions and quota errors reject the write; drafts remain visible.
- JSON export/import includes all Academy, Training and Fuel records, check-ins, custom foods, goals, preferences, pantry and shopping data.
- Import validates before the review dialog and downloads a current backup before a confirmed replacement. Import replaces, rather than merges. An old Academy backup contains no Power-Up data; the review makes that consequence explicit.
- Academy 1.0 cannot read schema-3 data/backups. Keep your original Academy JSON backup before trying 1.1. Review on localhost or a separate browser origin; do not replace your installed app during review.
- Safari storage eviction, clearing website data, private browsing or deleting the app can remove local records. Keep downloaded private backups; persistent storage is best effort.
- No record uploads, analytics, remote fonts or cloud synchronization. Service-worker caches hold app assets only. JSON/CSV files, local work, test artifacts and screenshots are ignored by Git. Never force-add personal records.

## Code map

| Path                                             | Responsibility                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `src/domain/model.ts`                            | Full state validation, initial Academy setup and sequential migrations             |
| `src/domain/validation.ts`                       | Shared ISO-date validation                                                         |
| `src/domain/attendance.ts`                       | Existing Academy scheduling, attendance, Rewind and CSV                            |
| `src/domain/power.ts`                            | Training/Fuel schemas, weekly/monthly activity calculations, weight averages       |
| `src/domain/nutrition.ts`                        | Offline food composition, estimates, GHOST rules, seasonal rotation, expiry labels |
| `src/storage/db.ts`                              | Atomic IndexedDB storage, stale-tab guard, complete JSON backup/files              |
| `src/components/TrainingView.tsx`                | Training dashboard, workout/goal editors                                           |
| `src/components/FuelView.tsx`                    | Fuel dashboard, food/meal/preferences/pantry/shopping editors                      |
| `src/components/PowerShared.tsx`                 | Draft tracking, save forms, module emblems, check-ins and weight chart             |
| `src/components/SettingsView.tsx`                | Academy configuration and combined backup review                                   |
| `src/App.tsx`                                    | App navigation, commit lifecycle, draft warnings and existing PWA lifecycle        |
| `scripts/build-sw.mjs`, `scripts/sw-template.js` | Content-versioned app-shell precache and safe worker updates                       |

Remaining future modules (BOSS BATTLES, CANON EVENTS, SIDE QUESTS and CHRONICLES) stay labelled as future. GHOST is a nutrition briefing foundation, not a general assistant.
