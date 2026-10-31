# ARC Academy 1.0 — release preparation review

Review date: 31 October 2026 (India).

## Verification

All checks passed on the completed source before committing:

| Check                                            | Result    |
| ------------------------------------------------ | --------- |
| Attendance and scheduling rules                  | 22 passed |
| IndexedDB, saving and backups                    | 10 passed |
| Service-worker behavior                          | 6 passed  |
| React application user flows                     | 8 passed  |
| Production Chromium browser tests                | 2 passed  |
| TypeScript compilation and Vite production build | Passed    |

Total: **48 automated tests passed; 0 failed**. The initial rerun also passed before the review fixes. No build-blocking error was found.

Commands used:

```sh
npm test
npm run build
ARC_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

The browser tests installed the real production service worker, disconnected the browser, reloaded the application, saved attendance and activities, reopened the saved record, downloaded CSV/JSON, and restored a JSON backup while offline. A phone-sized viewport passed navigation, past-date editing, and horizontal-overflow checks.

## Reviewed behavior

- Attendance is attended divided by attended plus absent. Unrecorded and cancelled sessions never enter the denominator. Percentages, subject IDs, session types, academic years, and clinical rotation IDs remain separate.
- Generated schedules do not infer missed classes on unrecorded dates. Saved days are independent snapshots. Later timetable/holiday edits do not silently rewrite them.
- IndexedDB writes are atomic and success is reported only after the transaction completes. A comparison within the write transaction rejects stale-tab overwrites. Failed saves retain the visible draft.
- Backups are fully validated before writing. Import is reviewed before replacing the complete local dataset. Unsupported versions and invalid references are rejected. Historical records and retained Rewind entries are included in JSON backups.
- The service worker precaches only local application files, not personal records. Installation must complete before offline readiness is shown. Cache cleanup stays within ARC's deployment scope. Updates wait for user action.
- The Pages workflow runs verification for pull requests. Opening this review branch/PR does not merge or deploy it. Deploying is a later action.

## Fixes made during this review

1. A damaged, falsy IndexedDB value (for example `null`) could previously appear to be an empty installation. ARC now distinguishes a missing record from an invalid record and rejects invalid stored data without overwriting it. Four regression cases verify preservation of the damaged value for recovery.
2. Editing while an asynchronous save completed could previously replace newly typed draft text with the submitted snapshot. The main form is now inactive during a pending save, day-change handlers reject edits during that interval, and configuration forms are also inactive while saving. A delayed-save test checks the stored note and unlocked UI after completion.
3. Backup validation now rejects duplicate Rewind revision IDs, protecting the identity of undo entries.

## Limits to check before eventual release

- A real iPhone/Safari installation and airplane-mode acceptance check is still needed. Chromium viewport tests are not physical-device certification.
- Browser storage can be cleared or evicted. Keep exported JSON backups outside the repository. There is intentionally no cloud sync.
- Attendance targets and the initial academic-year end date are editable planning placeholders, not confirmed college rules.
- This is a focused review and tested release preparation, not a guarantee that every possible browser or input is free of defects.

The commit includes source, configuration, tests, original icons, workflow, and documentation. Generated builds, dependencies, screenshots, traces, work files, and exported user backup/attendance files are ignored by Git. No existing project file was deleted or discarded.
