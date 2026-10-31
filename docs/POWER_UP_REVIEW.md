# ARC 1.1 — Operation Power-Up review

Review date: **1 November 2026 (India)**.

Feature branch: `arc-1.1-operation-power-up`, based on Academy 1.0's merged `main` commit `d1c3cc06d34fef6d01d28a0b014e51ac64d9a981`.

This work is for review only. No production deployment or merge is authorized by this review document. The main branch, production hosting workflow and installed Academy application remain unchanged.

## Implemented

Training: one-tap gym/football/running/rest logs, optional details, workout and exercise checkboxes, exercises/sets/repetitions/weights, editable weekly goals (sports starts once/week), monthly activity statistics, shared optional weight/sleep/energy/digestion check-ins and eight-week weight averages.

Fuel: all four meal categories, honest unknown PG meals/portions, 11 offline reference foods and explicit portions, custom foods/favourite PG meals, approximate supported nutrient estimates, editable protein/budget/diet/storage preferences, weekly known-protein chart, seasonal fruit rotation, grocery checklist with editable planning prices, MINI STASH inventory and entered-expiry reminders.

GHOST: deterministic offline nutrient briefing for protein, fibre, calcium, iron, vitamin C and B12, separate insufficient-data/estimated-gap states, affordable suggestions with reasons and preference/budget/storage filters. Full reference documentation is available within the offline app.

Data: pure sequential schema 1→2→3 migration, same IndexedDB store, atomic writes, corrupted/future-state rejection, existing stale-tab protection, combined JSON backups and explicit restore review. Academy calculations and scheduling are unchanged.

## Verification

All final checks passed:

| Check                                                         |    Result |
| ------------------------------------------------------------- | --------: |
| Existing Academy attendance/scheduling                        | 22 passed |
| Existing Academy React flows                                  |  8 passed |
| Existing IndexedDB/backups                                    | 10 passed |
| Existing service-worker behavior                              |  6 passed |
| New nutrition and GHOST rules                                 | 20 passed |
| New Training calculations/validation                          |  8 passed |
| New sequential migrations, atomic writes and combined backups | 12 passed |
| New Training/Fuel React flows                                 |  7 passed |
| Production Chromium browser checks (2 Academy + 3 Power-Up)   |  5 passed |
| TypeScript and Vite production build                          |    Passed |
| Git whitespace/error check                                    |    Passed |

**Total: 93 unit/UI tests + 5 production browser tests = 98 passed, 0 failed.** No tests are skipped. No dependency was added. Production assets include the source/portion documentation and the service worker precaches all nine local app files.

Commands used:

```sh
npm test
npm run build
ARC_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Browser checks install the production service worker, disable the browser network, save/reload Training and Fuel, export/restore combined backups, verify the Academy sentinel, and migrate genuine schema-2 IndexedDB data while comparing exact Academy days, revisions and subjects. Phone checks use 402×874 and verify no horizontal overflow, detailed workout entry, custom PG foods, budget editing, shopping and expiry reminders. Screenshots contain empty/synthetic data only and are excluded from Git.

Failure injection covers quota/interrupted writes and save-draft preservation. Damaged/current/future schemas are rejected without overwriting local storage. Migration reads do not write; a successful later save commits the validated full state atomically.

The first browser passes exposed test-harness assumptions about offscreen mobile navigation and asynchronous saved checkboxes; corrected assertions now wait for the durable result. All final tests pass without retries. Review also improved the narrow-screen fruit-card layout.

## Limits to understand

- Nutrition is approximate. Household portion sizes are disclosed assumptions and local PG recipes can differ. Unknown composition/quantity is never given invented values.
- General adult reference markers are not personalized requirements, medical diagnoses or proof of adequate intake. Only the documented nutrient set is supported.
- Food exclusions match suggested food names and are not an allergy safety system. Check product ingredients yourself.
- Suggestion prices and grocery budgets are entered planning estimates, not live market prices. Weekly shopping reset is manual; each food suggestion fits the remaining plan individually.
- Fruit rotation is a simple seasonal suggestion, not an automatic meal plan. Pantry consumption and meal logging are independent; no guessed stock depletion or shelf-life dates.
- Expiry reminders are shown when the app is open. No background notifications, external AI or online food lookup is implemented.
- Body check-ins have one editable record per date, shared by Training and Fuel. Weekly averages include recorded weights only.
- Training records are separate from the original Academy habits, which are preserved as saved. Logging a workout does not rewrite an Academy day.
- Database schema 3 can read previous Academy backups; Academy 1.0 cannot read new schema-3 backups. Keep the original backup for rollback. Current backup restore replaces every module after review.
- Browser tests use Chromium and a 402×874 phone viewport. A physical iPhone 17/Safari test remains an owner review step.

## Beginner-friendly morning review

1. **Keep your installed Academy app as it is.** Open Settings there and export a JSON backup to Files. Keep that file private.
2. Open the pull request's changed-files and checks views. Do not press Merge or run a production deployment.
3. On a computer, check out this feature branch and run `npm ci`, `npm run build`, then `npm run preview`. Open the printed localhost address. Use this separate local browser storage for review.
4. In Training, tap Gym once; add a detailed workout; tick/un-tick completion; record rest, weight and optional sleep. Reload and verify the saved entries and chart. Edit the sports goal.
5. In Fuel, log two eggs only after confirming the displayed serving; log an unknown PG lunch. Check that its unknown nutrition does not become zero. Create a PG favourite and try it in a meal.
6. Mark a fully logged known-food day complete and inspect GHOST's explanations. Add unknown food and confirm the day reopens / unknown nutrient data are labelled insufficient. Try diet, exclusion, budget and fridge preferences.
7. Add an estimated grocery price, tick it as purchased and check the remaining plan. Add a MINI STASH food with an expiry date; confirm its reminder. Record weight/energy/digestion if useful.
8. Wait for Offline ready, turn off the test computer's internet (or use browser offline mode), reload, save another Training/Fuel entry and reload again. The source branch does not install on your iPhone by itself.
9. Export a test JSON backup and restore it in this local review environment. If testing with a copy of real Academy records, keep it local and confirm Academy attendance, clinical postings and original notes before and after a Training/Fuel save. Never attach that backup or personal screenshots to GitHub.
10. Keep the PR unmerged until you are comfortable with the review. Physical iPhone/Safari verification and any future production rollout require a separate decision.
