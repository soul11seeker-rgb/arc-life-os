# ARC — Every Day Writes Your Story

**ARC Academy 1.0** is a real, offline-first attendance app made with React, TypeScript, Vite, and IndexedDB. It is designed for an iPhone, also works on desktop, and needs no login, paid API, database subscription, or Apple Developer account.

The interface uses an original angular A, near-black panels, electric crimson, and subtle cyan. It includes no copyrighted superhero characters or logos.

## What is built

- **Today:** date picker, independent Attended / Absent / Cancelled / Not recorded marks, multiple sessions of any subject per day, one-off sessions, study/gym/run-or-football checkboxes, notes, and SAVE DAY.
- **Attendance:** separate lecture and practical statistics for each subject, configurable targets, warnings, a saved-session register, weekly progress chart, CSV export, and a what-if simulator.
- **Clinical:** add/edit/rename/archive departments and rotations, with confirmed date ranges, posting weekdays, individual rotation targets, and separate department and rotation percentages. There is no fixed list or application-imposed limit on the number of departments or rotations.
- **Timetable:** custom weekly classes with effective date ranges. Each slot generates its own session, even when the subject and date are the same.
- **Holidays and exceptions:** custom date ranges, Christmas/Sankranti breaks when confirmed, college cancellations, and special working days that follow a chosen weekday. Scope rules to all classes, one session type, or one subject/department.
- **Calendar:** monthly view and editable past records. Open a date, correct it, then save.
- **REWIND:** previous versions of the last 100 day saves. Undo the latest save for an individual date without touching other dates.
- **Settings:** academic years, subjects, independent targets, warning margin, basic confirmed exam dates, JSON backups, validated import with a review step, and installation instructions.
- **Offline PWA:** generated app-shell service worker, installation icons, standalone manifest, safe update prompt, and offline readiness indicator.
- **Deployment:** a GitHub Actions workflow for free GitHub Pages at `/arc-life-os/`.

GHOST, FUEL, expanded TRAINING, BOSS BATTLES preparation, CANON EVENTS, SIDE QUESTS, and CHRONICLES are deliberately not implemented. The Settings roadmap labels them as future modules; they are not pretend working features.

## Important starting settings

The default subjects are Pharmacology, Microbiology, and Pathology. The initial academic year starts **2 November 2026**. Its end date, **1 November 2027**, is an editable planning placeholder, not an official college date. The initial lecture target of **75%**, practical target of **80%**, and clinical default of **75%** are also editable placeholders: confirm your college's actual rules.

There is **no invented timetable, attendance, posting department, rotation, or holiday date**. Add confirmed information in the app. The empty statistics display a dash rather than a false percentage.

## Review the app on your computer

Install the free **Node.js 22 LTS** or a newer supported version. Open a terminal in the `arc-life-os` folder and run these commands one at a time:

```sh
npm ci
npm run dev
```

Open the Local address printed in the terminal, normally:

```text
http://localhost:5173/arc-life-os/
```

The development server is for editing. To try the **real offline production app**, stop the development server with Ctrl+C and run:

```sh
npm run build
npm run preview
```

Open the address it prints, normally `http://localhost:4173/arc-life-os/`. Wait for **Offline ready**. Localhost supports service workers; an ordinary unencrypted LAN address does not. For your iPhone, use the HTTPS GitHub Pages link after publication.

Development and preview use different ports and therefore have separate browser storage. Publishing also uses a different origin. Move records using JSON export/import.

## Publish to your existing GitHub repository

The project is prepared for `soul11seeker-rgb/arc-life-os`. Nothing in ARC uploads your attendance to GitHub. Publish the source code, not exported records.

1. Review the changed files in your editor or GitHub Desktop. `src/` is the app, `tests/` and `e2e/` are automated checks, and `.github/workflows/deploy.yml` handles deployment.
2. Save the changes in Git and publish your branch. If working from the original repository checkout, you can use:

   ```sh
   git switch -c arc-academy-1
   git add .
   git commit -m "Build ARC Academy 1.0 offline attendance PWA"
   git push -u origin arc-academy-1
   ```

3. On GitHub, open a pull request from `arc-academy-1` into `main`. A pull request is a review page for the changes. The workflow runs tests and a build on the pull request. It does not deploy the pull request.
4. In the repository, open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**. Enable Actions for the repository if GitHub asks.
5. Merge the pull request into `main`. The workflow tests, builds, runs real browser checks, and deploys. Open **Actions → Verify and deploy ARC Academy** to watch it. A green result means the workflow succeeded.
6. Open the URL shown in the deployment result. With the current repository name, it should be:

   ```text
   https://soul11seeker-rgb.github.io/arc-life-os/
   ```

This is the **expected address after you deploy**, not a claim that it is already live. GitHub Pages should be free for a public repository under GitHub's current plan rules. No paid hosting service is used. If your default branch is not `main`, update the two branch entries in the workflow.

If you later change the repository name or use a custom domain, update `VITE_BASE_PATH` in the workflow. It must begin and end with `/`; use `/` for a root custom-domain deployment. The manifest, assets, and worker scope use this base. Back up first: different origins have separate browser storage.

## Install on your iPhone

1. Open your published **HTTPS** address in Safari.
2. Tap **Share → Add to Home Screen**. If shown, enable **Open as Web App**.
3. Launch ARC from its new icon while connected. Wait for **Offline ready**.
4. Turn on airplane mode. Reopen ARC, log a day, save, close, and reopen to check your record.

An Apple Developer account and the App Store are not required. The browser tests emulate a 402 × 874 phone viewport in Chromium; they are not a physical iPhone/Safari certification. The steps above are the final real-device acceptance check.

## Your first day

1. In **Settings**, confirm your academic year dates and attendance targets.
2. In **Timetable**, add each confirmed weekly lecture and practical. Add a separate slot for each session, including a second lecture of the same subject on the same weekday.
3. If postings are announced, add departments and rotations in **Clinical**. Otherwise leave it empty.
4. On **Today**, choose your date, mark the sessions, tick your activities, and press **SAVE DAY**. Changes are a draft until saving succeeds.
5. Leave a class as **Not recorded** if you do not know its status. Do not mark it Absent to fill a gap.
6. Export a JSON backup regularly, especially before changing devices or clearing browser data.

You can add one-off sessions before your timetable is ready. For a one-off clinical session, select its department and optionally its rotation. Select the correct academic year in Settings (or the desktop header) before adding a one-off session for an older year.

## How attendance works

```text
attendance = attended / (attended + absent) × 100
```

Only **saved** Attended and Absent sessions are eligible. Cancelled and Not recorded are excluded. Unsaved dates and passing days do not add absences. Zero eligible sessions means no percentage, displayed as `—`.

Percentages are displayed to one decimal place, but target comparisons use the unrounded value. Lecture, practical, and clinical categories stay separate. Summary cards combine sessions within a category; each subject and posting still has its own requirement. The calendar's daily percentage combines session types for orientation and is not an eligibility decision.

The simulator projects added attended/absent sessions without writing records. Recovery assumes all subsequent sessions are attended. A 100% target cannot be reached in a finite number of new sessions after an absence. Targets are session-based percentages; hour weighting, exam eligibility policies, and college-specific exceptions to the percentage formula are outside Academy 1.0.

## Schedule changes and corrections

A saved day stores a **snapshot** of each session's identity, academic year, original display name, time, type, rotation, and mark. Updating a timetable or renaming/archiving a subject does not rewrite saved history.

To change a repeating schedule, end the old slot's effective date range and add another slot with its new dates. Unsaved days are generated from applicable year/date/weekday rules. The current year selector filters statistics and selects the year for configuration and manual additions. A daily checklist can retain sessions from any academic year scheduled on that date; changing the selector never discards those records.

If you want an existing saved date to follow a new schedule or holiday, open it and choose **Rebuild from schedule**. This explicitly replaces the displayed sessions and marks, while keeping activities and notes. Nothing changes on disk until SAVE DAY. Navigation warns before discarding an unsaved draft.

Closure rules (holiday/cancellation) win over special working-day rules. Among overlapping applicable closure rules, the last rule in the list supplies the cancellation reason. Among applicable working-day rules, the last rule supplies the replacement weekday. Working-day rules replace, rather than duplicate, the chosen day's schedule. Rotation date ranges and slot effective ranges still apply.

Archiving a subject, department, slot, or rotation stops its new automatic session generation; saved records remain. Academic-year archiving is an organizational marker and does not delete historical schedules or records. You can still select archived years to inspect and correct their history.

For ordinary corrections, open the date from Calendar or the register, edit, and save. Use **Settings → REWIND** to undo the latest save for that date. Its latest 100 saved revisions are available; this is not a replacement for backups.

## Backup and privacy

- **JSON export** contains all academic years, settings, configuration, attendance, activities, notes, exams, and retained Rewind history. Store it in Files or another location you control.
- **JSON import** validates dates, percentages, identities, references, duplicate records, version, and session statuses before any write. Review the counts first. Restore replaces the complete local dataset; it does not merge. The restore button first initiates a download of your current dataset.
- **CSV export** includes every saved session across all academic years, with subject/department, type, time, rotation/session label, status, and cancellation reason. It is suitable for a spreadsheet and is not a restore format. Formula-like cell content is escaped.
- Data lives in **IndexedDB on this browser/origin**. No analytics, third-party fonts, remote APIs, accounts, or cloud synchronization are included. Public service-worker caches contain only app files.
- Browser storage is not a guaranteed backup. Clearing site data, private browsing, storage eviction, or deleting the web app can remove records. Request persistent storage in Settings if available; the app reports the browser's actual answer.
- Two tabs cannot silently overwrite each other's newer saved state. If a conflict is detected, your attempted save is rejected and the draft stays visible. Copy your unsaved note/marks before reloading and keep editing in one tab.
- Do not put backup JSON/CSV files or screenshots containing personal records into the repository. `.gitignore` excludes generated backup/export names, `backups/`, dependencies, builds, local work, and test artifacts. It cannot protect a private file you manually rename and force-add.

## Automated checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For all checks after the browser is installed:

```sh
npm run check
```

If Chromium is already installed by your environment, point to it:

```sh
ARC_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

On Windows, use the normal Playwright-installed browser instead of this Linux-specific command.

The test suite includes:

- Subject/type separation; repeated same-day sessions; clinical department and rotation totals.
- Holiday ranges, targeted cancellations, special working days, date boundaries, and excluded unrecorded sessions.
- Accurate calculations, recovery, what-if results, past-date edits, Rewind order, and future academic years.
- IndexedDB save/reopen, JSON round trip, invalid backup rejection, migrations, stale-tab protection, and saving without network calls.
- Service-worker shell caching, interrupted install, offline asset requests, scope isolation, update behavior, and old-cache cleanup.
- React user flows for logging, reopen, date correction, clinical/timetable setup, and failed-save draft preservation.
- Real production Chromium tests: service-worker installation, genuinely offline reload/save/reload, offline JSON restore and CSV download, mobile date correction/navigation, no horizontal overflow, and uncaught application errors.

GitHub Actions installs Chromium and runs the same production browser checks after the build. Screenshots and traces use synthetic or empty records only and are ignored by Git.

## Source map for later development

```text
src/domain/model.ts           Versioned data contracts, validation, seed, migrations
src/domain/attendance.ts      Pure scheduling, calculations, snapshots, Rewind, CSV
src/storage/db.ts             IndexedDB transactions, conflict detection, JSON/files
src/components/DayView.tsx    Fast daily checklist and manual sessions
src/components/AttendanceView.tsx  Statistics, register, simulator, calendar
src/components/Manage.tsx     Configuration editors, clinical, timetable, date rules
src/components/SettingsView.tsx    Years, subjects, backups, Rewind, roadmap
src/components/ui.tsx         Shared panels, accessible native dialogs, branding
src/App.tsx                   Navigation, drafts, saves, PWA lifecycle, app shell
src/styles.css                Responsive original visual system
scripts/build-sw.mjs          Precaches every production file with a content version
scripts/sw-template.js        Offline shell, safe updates, scoped cache handling
public/                       Manifest and original install icons
```

The IndexedDB database version is **1**; the serialized application schema is **2**. These are intentionally different: the object-store layout has not changed, while the application schema supports a validated version-1-to-2 migration. Unknown future versions are rejected rather than reset. A failed validation, read, or write never silently wipes your dataset. An unreadable local database produces a recovery message instead of a new blank app.

For a future module, add its domain code and UI in a separate folder. If stored data changes, add a sequential migration in `parseState`, increment the schema version, preserve old fields and identities, and add migration/round-trip tests before exposing the feature. Do not connect future modules to public Git-tracked JSON files. Keep Academy calculations independent of future nutrition, companion, or entertainment features.

**ARC // THE ORIGIN BEGINS.**
