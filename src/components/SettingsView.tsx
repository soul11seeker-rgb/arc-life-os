import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Plus,
  ShieldCheck,
  History,
  Trash2,
  HardDrive,
  Smartphone,
} from "lucide-react";
import type { State, Subject, Year } from "../domain/model";
import { today } from "../domain/model";
import { backupJSON, downloadFile, restoreJSON } from "../storage/db";
import { rewind } from "../domain/attendance";
import { Editor, RowActions } from "./Manage";
import type { Commit } from "./Manage";
import {
  Dialog,
  Empty,
  Field,
  formatDate,
  PageIntro,
  Panel,
  SectionHead,
} from "./ui";
export function SettingsView({
  state,
  commit,
  onInstall,
}: {
  state: State;
  commit: Commit;
  onInstall: () => void;
}) {
  const [editor, setEditor] = useState<{
    type: "subjects" | "years" | "exams";
    item?: Subject | Year | State["exams"][number];
  } | null>(null);
  const [restore, setRestore] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [storage, setStorage] = useState("");
  const [margin, setMargin] = useState(state.settings.warningMargin);
  const input = useRef<HTMLInputElement>(null);
  const exportBackup = () =>
    downloadFile(
      backupJSON(state),
      `arc-backup-${today()}.json`,
      "application/json",
    );
  const year = state.years.find((y) => y.id === state.currentYearId)!;
  const latest = new Map<string, string>();
  state.revisions.forEach((r) => latest.set(r.date, r.id));
  return (
    <>
      <PageIntro
        tag="MAKE IT YOURS"
        title="Protocol settings"
        description="Your academy can evolve. Your history comes with you."
      />
      <div className="settings-grid">
        <Panel>
          <SectionHead
            eyebrow="YOUR DATA. YOUR CONTROL."
            title="Backup & restore"
          />
          <p className="muted">
            Your private records live in this browser’s IndexedDB, never in
            GitHub or a cloud database. Export regularly and before changing
            devices.
          </p>
          <div className="backup-actions">
            <button className="button primary" onClick={exportBackup}>
              <Download size={17} /> Export JSON backup
            </button>
            <button
              className="button secondary"
              onClick={() => input.current?.click()}
            >
              <Upload size={17} /> Import JSON backup
            </button>
            <input
              ref={input}
              hidden
              type="file"
              accept=".json,application/json"
              aria-label="Import backup file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 25 * 1024 * 1024)
                    throw new Error("Backup is too large (25 MB maximum).");
                  setRestore(restoreJSON(await file.text()));
                  setError("");
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Could not read this backup.",
                  );
                }
              }}
            />
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <div className="info-strip">
            <ShieldCheck size={20} />
            <span>
              Import validates the full backup before replacing anything. It
              replaces local data; it does not merge it. Keep backup files
              private.
            </span>
          </div>
          <p className="helper">
            iPhone storage can be removed by clearing website data or by the
            system. A downloaded backup is your portable recovery copy. ARC
            works without paid services or an account.
          </p>
        </Panel>
        <Panel>
          <SectionHead
            eyebrow="BUILT FOR YOUR POCKET"
            title="Install & offline"
          />
          <p className="muted">
            Open ARC once online and wait for “Offline ready”. After that, the
            app and all core tracking work without internet.
          </p>
          <div className="backup-actions">
            <button className="button secondary" onClick={onInstall}>
              <Smartphone size={17} /> Install on iPhone
            </button>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  const persisted = await navigator.storage?.persist?.();
                  setStorage(
                    persisted
                      ? "Persistent storage granted by this browser."
                      : "This browser did not grant persistent storage. Keep regular JSON backups.",
                  );
                } catch {
                  setStorage(
                    "Storage protection is not available here. Keep regular JSON backups.",
                  );
                }
              }}
            >
              <HardDrive size={17} /> Request storage protection
            </button>
          </div>
          {storage && (
            <p className="helper" role="status">
              {storage}
            </p>
          )}
          <p className="helper">
            Installing does not sync data between Safari, other browsers, or
            devices. Export and import your backup to move records. Offline
            operation requires HTTPS or localhost and one complete online load.
          </p>
        </Panel>
      </div>
      <Panel>
        <SectionHead
          eyebrow="THE LONG GAME"
          title="Academic years"
          action={
            <button
              className="text-button"
              onClick={() => setEditor({ type: "years" })}
            >
              <Plus size={16} /> Add year
            </button>
          }
        />
        <p className="helper">
          The initial year end date is a planning placeholder. Set your
          confirmed start and end dates. New years have their own subjects,
          timetable, rotations, and rules.
        </p>
        <div className="management-list">
          {state.years.map((y) => (
            <div className="management-row" key={y.id}>
              <div className="year-token">
                {y.id === state.currentYearId ? "↗" : "//"}
              </div>
              <div className="grow">
                <h3>
                  {y.name}
                  {y.archived && <span className="pill">Archived</span>}
                </h3>
                <p>
                  {formatDate(y.start)} – {formatDate(y.end)}
                </p>
              </div>
              <button
                className={`button ${y.id === state.currentYearId ? "selected-year" : "secondary"}`}
                disabled={y.id === state.currentYearId}
                onClick={() =>
                  commit(
                    { ...state, currentYearId: y.id },
                    "Academic year selected",
                  )
                }
              >
                {y.id === state.currentYearId ? "Selected" : "Select"}
              </button>
              <RowActions
                archived={y.archived}
                onEdit={() => setEditor({ type: "years", item: y })}
                onArchive={() => {
                  if (y.id === state.currentYearId) {
                    setError(
                      "Select a different year before archiving this year.",
                    );
                    return;
                  }
                  void commit(
                    {
                      ...state,
                      years: state.years.map((x) =>
                        x.id === y.id ? { ...x, archived: !x.archived } : x,
                      ),
                    },
                    "Academic year updated",
                  );
                }}
              />
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <SectionHead
          eyebrow={year.name.toUpperCase()}
          title="Subjects & attendance rules"
          action={
            <button
              className="text-button"
              onClick={() => setEditor({ type: "subjects" })}
            >
              <Plus size={16} /> Add subject
            </button>
          }
        />
        <div className="management-list">
          {state.subjects
            .filter((s) => s.yearId === year.id)
            .map((s) => (
              <div className="management-row" key={s.id}>
                <div className="grow">
                  <h3>
                    {s.name}
                    {s.archived && <span className="pill">Archived</span>}
                  </h3>
                  <p>
                    Lecture target {s.lectureTarget}% · Practical target{" "}
                    {s.practicalTarget}%
                  </p>
                </div>
                <RowActions
                  archived={s.archived}
                  onEdit={() => setEditor({ type: "subjects", item: s })}
                  onArchive={() =>
                    commit(
                      {
                        ...state,
                        subjects: state.subjects.map((x) =>
                          x.id === s.id ? { ...x, archived: !x.archived } : x,
                        ),
                      },
                      "Subject updated; history preserved",
                    )
                  }
                />
              </div>
            ))}
        </div>
        <p className="helper">
          Targets are configurable per subject and clinical posting. Renaming
          keeps the subject’s identity; saved sessions retain the original
          display name. Archiving stops new generated sessions and preserves the
          register.
        </p>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            void commit(
              {
                ...state,
                settings: { ...state.settings, warningMargin: margin },
              },
              "Warning margin updated",
            );
          }}
        >
          <Field label="Warning margin above target (percentage points)">
            <input
              type="number"
              min="0"
              max="30"
              step="0.1"
              required
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
            />
          </Field>
          <button className="button secondary">Save margin</button>
        </form>
      </Panel>
      <Panel>
        <SectionHead
          eyebrow="DATES ON THE HORIZON"
          title="Exam dates"
          action={
            <button
              className="text-button"
              onClick={() => setEditor({ type: "exams" })}
            >
              <Plus size={16} /> Add exam
            </button>
          }
        />
        {state.exams.filter((x) => x.yearId === year.id).length ? (
          <div className="management-list">
            {state.exams
              .filter((x) => x.yearId === year.id)
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((x) => (
                <div className="management-row" key={x.id}>
                  <div className="grow">
                    <h3>{x.name}</h3>
                    <p>{formatDate(x.date)}</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setEditor({ type: "exams", item: x })}
                  >
                    Edit
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${x.name}`}
                    onClick={() => {
                      if (confirm("Remove this exam date?"))
                        void commit(
                          {
                            ...state,
                            exams: state.exams.filter((e) => e.id !== x.id),
                          },
                          "Exam date removed",
                        );
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="muted">
            Add confirmed exam names and dates. Preparation and BOSS BATTLES
            will come in a later version.
          </p>
        )}
      </Panel>
      <Panel>
        <SectionHead
          eyebrow="HISTORY CAN BE CORRECTED"
          title="REWIND history"
        />
        <p className="helper">
          The last 100 saves are retained for undo. Restore only the latest save
          for each date. Restoring a first save makes the day unsaved again;
          restoring an edit brings back the previous saved version.
        </p>
        {state.revisions.length ? (
          <div className="management-list">
            {[...state.revisions]
              .reverse()
              .slice(0, 20)
              .map((r) => (
                <div className="management-row" key={r.id}>
                  <History size={20} className="muted" />
                  <div className="grow">
                    <h3>{formatDate(r.date)}</h3>
                    <p>
                      {r.previous ? "Edited saved day" : "First save"} ·{" "}
                      {new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Kolkata",
                      }).format(new Date(r.at))}{" "}
                      IST
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    disabled={latest.get(r.date) !== r.id}
                    onClick={() => {
                      if (
                        confirm(
                          `Undo the latest save for ${formatDate(r.date)}? Your other dates will be preserved.`,
                        )
                      )
                        void commit(
                          rewind(state, r.id),
                          "Previous version restored",
                        );
                    }}
                  >
                    <History size={15} /> Undo save
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <Empty title="No saves to rewind yet">
            Every time you save a day, ARC keeps its previous version here.
          </Empty>
        )}
      </Panel>
      <Panel className="future-panel">
        <SectionHead
          eyebrow="THE UNIVERSE EXPANDS LATER"
          title="One strong foundation"
        />
        <p className="muted">
          Academy, Training and Fuel are active. The following modules are
          planned and have no tracking features in this version.
        </p>
        <div className="future-modules">
          {["BOSS BATTLES", "CANON EVENTS", "SIDE QUESTS", "CHRONICLES"].map(
            (m) => (
              <span key={m}>
                {m}
                <small>FUTURE</small>
              </span>
            ),
          )}
        </div>
      </Panel>
      {editor && (
        <Editor
          {...editor}
          state={state}
          commit={commit}
          onClose={() => setEditor(null)}
        />
      )}
      {restore && (
        <Dialog
          title="Review backup before restoring"
          onClose={() => setRestore(null)}
        >
          <p>This backup contains:</p>
          <div className="restore-summary">
            <b>{Object.keys(restore.days).length} saved days</b>
            <b>{restore.years.length} academic years</b>
            <b>{restore.subjects.length} subjects</b>
            <b>{restore.departments.length} departments</b>
            <b>{restore.training.entries.length} Training logs</b>
            <b>{restore.fuel.meals.length} meal items</b>
            <b>{restore.training.wellness.length} body check-ins</b>
            <b>{restore.fuel.foods.length} custom foods</b>
            <b>{restore.fuel.pantry.length} stash items</b>
            <b>{restore.fuel.shopping.length} shopping items</b>
          </div>
          <p className="muted">
            Restoring replaces Academy, Training and Fuel data currently stored
            in this browser. Academy 1.0 backups contain no Training or Fuel
            records; restoring them clears those modules after your
            confirmation. A backup of your current records will download first.
            Keep that file in case you need to reverse the restore.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setRestore(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={async () => {
                exportBackup();
                if (await commit(restore, "Backup restored successfully"))
                  setRestore(null);
              }}
            >
              Download current & restore
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
