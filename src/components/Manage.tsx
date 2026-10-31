import { useState } from "react";
import {
  Plus,
  Pencil,
  Archive,
  RotateCcw,
  CalendarRange,
  Building2,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import type {
  State,
  Subject,
  Department,
  Rotation,
  Slot,
  Exception,
  Year,
} from "../domain/model";
import { uid, today, parseState } from "../domain/model";
import {
  attendance,
  kindLabel,
  pct,
  recordedSessions,
  projection,
} from "../domain/attendance";
import {
  Dialog,
  Empty,
  Field,
  formatDate,
  PageIntro,
  Panel,
  SectionHead,
} from "./ui";
export type Commit = (state: State, message?: string) => Promise<boolean>;
type RecordType =
  | "subjects"
  | "departments"
  | "rotations"
  | "slots"
  | "exceptions"
  | "years"
  | "exams";
type Editable =
  | Subject
  | Department
  | Rotation
  | Slot
  | Exception
  | Year
  | State["exams"][number];
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const singular: Record<RecordType, string> = {
  subjects: "subject",
  departments: "department",
  rotations: "rotation",
  slots: "weekly class",
  exceptions: "date rule",
  years: "academic year",
  exams: "exam",
};
export function Editor({
  type,
  item,
  state,
  commit,
  onClose,
}: {
  type: RecordType;
  item?: Editable;
  state: State;
  commit: Commit;
  onClose: () => void;
}) {
  const year = state.years.find((y) => y.id === state.currentYearId)!;
  const v = (key: string, fallback: string | number = "") =>
    (item as unknown as Record<string, string | number> | undefined)?.[key] ??
    fallback;
  const [ruleType, setRuleType] = useState(String(v("type", "holiday")));
  const [scope, setScope] = useState(String(v("scope", "all")));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "");
    const n = (k: string) => Number(f.get(k));
    const base = { id: item?.id ?? uid() };
    let record: Editable;
    switch (type) {
      case "subjects":
        record = {
          ...base,
          yearId: year.id,
          name: s("name"),
          archived: (item as Subject)?.archived ?? false,
          lectureTarget: n("lectureTarget"),
          practicalTarget: n("practicalTarget"),
        };
        break;
      case "departments":
        record = {
          ...base,
          name: s("name"),
          archived: (item as Department)?.archived ?? false,
          target: n("target"),
        };
        break;
      case "years":
        record = {
          ...base,
          name: s("name"),
          start: s("start"),
          end: s("end"),
          archived: (item as Year)?.archived ?? false,
        };
        break;
      case "rotations":
        record = {
          ...base,
          yearId: year.id,
          departmentId: s("departmentId"),
          name: s("name"),
          start: s("start"),
          end: s("end"),
          weekdays: f.getAll("weekdays").map(Number),
          time: s("time"),
          target: n("target"),
          archived: (item as Rotation)?.archived ?? false,
        };
        break;
      case "slots":
        record = {
          ...base,
          yearId: year.id,
          subjectId: s("subjectId"),
          kind: s("kind") as Slot["kind"],
          weekday: n("weekday"),
          time: s("time"),
          label: s("label"),
          from: s("start"),
          to: s("end"),
          archived: (item as Slot)?.archived ?? false,
        };
        break;
      case "exceptions":
        record = {
          ...base,
          yearId: year.id,
          name: s("name"),
          start: s("start"),
          end: s("end"),
          type: ruleType as Exception["type"],
          scope: scope as Exception["scope"],
          entityId: scope === "all" ? "" : s("entityId"),
          weekday: ruleType === "working" ? n("weekday") : 0,
        };
        break;
      case "exams":
        record = { ...base, yearId: year.id, name: s("name"), date: s("date") };
        break;
    }
    const list = state[type] as Editable[];
    const next = {
      ...state,
      [type]: item
        ? list.map((x) => (x.id === item.id ? record : x))
        : [...list, record],
    };
    try {
      parseState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check your entries.");
      return;
    }
    setError("");
    setBusy(true);
    if (await commit(next, `${singular[type]} ${item ? "updated" : "added"}`))
      onClose();
    else
      setError(
        "Could not save to this device. Close other ARC tabs, check available storage, then try again. Your entries are still here.",
      );
    setBusy(false);
  };
  return (
    <Dialog
      title={`${item ? "Edit" : "Add"} ${singular[type]}`}
      onClose={onClose}
    >
      <form onSubmit={submit} inert={busy} aria-busy={busy}>
        {type !== "slots" && (
          <Field label="Name">
            <input
              autoFocus
              name="name"
              required
              maxLength={160}
              defaultValue={v("name")}
              placeholder={
                type === "exceptions"
                  ? "e.g. Sankranti break (confirmed dates)"
                  : type === "rotations"
                    ? "e.g. Medicine · Rotation 1"
                    : undefined
              }
            />
          </Field>
        )}
        {type === "subjects" && (
          <div className="form-grid">
            <TargetInput
              label="Lecture target (%)"
              name="lectureTarget"
              value={v("lectureTarget", 75)}
            />
            <TargetInput
              label="Practical target (%)"
              name="practicalTarget"
              value={v("practicalTarget", 80)}
            />
          </div>
        )}
        {(type === "departments" || type === "rotations") && (
          <TargetInput
            label="Attendance target (%)"
            name="target"
            value={v("target", 75)}
          />
        )}
        {type === "rotations" && (
          <Field label="Department">
            <select
              required
              name="departmentId"
              defaultValue={v("departmentId")}
            >
              <option value="">Choose department…</option>
              {state.departments
                .filter((d) => !d.archived || d.id === v("departmentId"))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </Field>
        )}
        {type === "slots" && (
          <>
            <Field label="Subject">
              <select required name="subjectId" defaultValue={v("subjectId")}>
                <option value="">Choose subject…</option>
                {state.subjects
                  .filter(
                    (x) =>
                      x.yearId === year.id &&
                      (!x.archived || x.id === v("subjectId")),
                  )
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Type">
              <select name="kind" defaultValue={v("kind", "lecture")}>
                <option value="lecture">Lecture / theory</option>
                <option value="practical">Practical</option>
              </select>
            </Field>
            <Field label="Session label">
              <input
                name="label"
                maxLength={160}
                defaultValue={v("label")}
                placeholder="e.g. Lecture 2 / Lab A"
              />
            </Field>
          </>
        )}
        {(type === "slots" || type === "rotations") && (
          <div className="form-grid">
            {type === "slots" && (
              <Field label="Weekly day">
                <select name="weekday" defaultValue={v("weekday", 1)}>
                  {days.map((d, i) => (
                    <option value={i} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Start time">
              <input
                required
                type="time"
                name="time"
                defaultValue={v("time", "09:00")}
              />
            </Field>
          </div>
        )}
        {type === "rotations" && (
          <fieldset>
            <legend>Posting weekdays</legend>
            <div className="weekday-choices">
              {days.map((d, i) => (
                <label key={d}>
                  <input
                    name="weekdays"
                    type="checkbox"
                    value={i}
                    defaultChecked={
                      (item as Rotation)?.weekdays?.includes(i) ??
                      (i >= 1 && i <= 6)
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {["years", "rotations", "slots", "exceptions"].includes(type) && (
          <div className="form-grid">
            <Field label={type === "slots" ? "Effective from" : "Start date"}>
              <input
                required
                type="date"
                name="start"
                defaultValue={v(
                  type === "slots" ? "from" : "start",
                  type === "years" ? today() : year.start,
                )}
              />
            </Field>
            <Field
              label={
                type === "slots" ? "Effective through" : "End date (inclusive)"
              }
            >
              <input
                required
                type="date"
                name="end"
                defaultValue={v(type === "slots" ? "to" : "end", year.end)}
              />
            </Field>
          </div>
        )}
        {type === "exceptions" && (
          <>
            <Field label="Rule type">
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
              >
                <option value="holiday">Holiday / break</option>
                <option value="cancelled">College cancellation</option>
                <option value="working">Special working day</option>
              </select>
            </Field>
            <Field label="Applies to">
              <select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">All session types</option>
                <option value="lecture">Lectures only</option>
                <option value="practical">Practicals only</option>
                <option value="clinical">Clinical postings only</option>
              </select>
            </Field>
            {scope !== "all" && (
              <Field label={scope === "clinical" ? "Department" : "Subject"}>
                <select
                  name="entityId"
                  key={scope}
                  defaultValue={v("entityId")}
                >
                  <option value="">
                    All {scope === "clinical" ? "departments" : "subjects"}
                  </option>
                  {(scope === "clinical"
                    ? state.departments
                    : state.subjects.filter((x) => x.yearId === year.id)
                  ).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {ruleType === "working" && (
              <Field label="Follow this weekday’s schedule">
                <select name="weekday" defaultValue={v("weekday", 1)}>
                  {days.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <p className="helper">
              Enter only dates confirmed by your college. A closure wins over a
              working-day rule. Among matching rules of the same type, the last
              rule in the list wins. Saved days keep their snapshot; rebuild a
              saved day explicitly to apply new rules.
            </p>
          </>
        )}
        {type === "exams" && (
          <Field label="Exam date">
            <input
              required
              name="date"
              type="date"
              defaultValue={v("date", today())}
            />
          </Field>
        )}
        {(type === "slots" || type === "rotations") && (
          <p className="helper">
            Changes apply to newly generated days. For schedule changes, end the
            old entry and add a new one with a new effective date. Saved records
            stay intact.
          </p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy} className="button primary" type="submit">
            {busy ? "Saving…" : "Save changes"} <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function TargetInput({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string | number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        name={name}
        min="1"
        max="100"
        step="0.1"
        required
        defaultValue={value}
      />
    </Field>
  );
}
export function ClinicalView({
  state,
  commit,
}: {
  state: State;
  commit: Commit;
}) {
  const [editor, setEditor] = useState<{
    type: "departments" | "rotations";
    item?: Editable;
  } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const departments = state.departments.filter(
    (d) => showArchived || !d.archived,
  );
  const rotations = state.rotations.filter(
    (r) => r.yearId === state.currentYearId && (showArchived || !r.archived),
  );
  const archive = (
    type: "departments" | "rotations",
    item: Department | Rotation,
  ) =>
    commit(
      {
        ...state,
        [type]: state[type].map((x) =>
          x.id === item.id ? { ...x, archived: !x.archived } : x,
        ),
      },
      item.archived ? "Restored" : "Archived; saved history preserved",
    );
  return (
    <>
      <PageIntro
        tag="LEARN WHERE IT MATTERS"
        title="Clinical postings"
        description="Your departments. Your rotations. Each with its own attendance."
        action={
          <button
            className="button primary"
            onClick={() => setEditor({ type: "departments" })}
          >
            <Plus size={17} /> Add department
          </button>
        }
      />
      <label className="toggle">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />{" "}
        Show archived departments and rotations
      </label>
      {!departments.length ? (
        <Panel>
          <Empty
            title="Your clinical chapter is unwritten"
            action={
              <button
                className="button secondary"
                onClick={() => setEditor({ type: "departments" })}
              >
                Add your first department <Plus size={16} />
              </button>
            }
          >
            When postings are announced, add any number of departments and
            rotations. No dates or departments have been assumed.
          </Empty>
        </Panel>
      ) : (
        <div className="department-grid">
          {departments.map((d) => {
            const a = attendance(
              recordedSessions(state, {
                yearId: state.currentYearId,
                entityId: d.id,
                kind: "clinical",
              }),
            );
            return (
              <Panel key={d.id} className="department-card">
                <div className="between">
                  <div className="subject-mark clinical">
                    <Building2 size={21} />
                  </div>
                  <RowActions
                    archived={d.archived}
                    onEdit={() => setEditor({ type: "departments", item: d })}
                    onArchive={() => archive("departments", d)}
                  />
                </div>
                <h2>
                  {d.name}{" "}
                  {d.archived && <span className="pill">Archived</span>}
                </h2>
                <div className="department-percentage">
                  {pct(a.percent)}
                  <span>Target {d.target}%</span>
                </div>
                <div className="track">
                  <i style={{ width: `${a.percent ?? 0}%` }} />
                </div>
                <p className="muted">
                  {a.attended} attended / {a.eligible} eligible · {a.unrecorded}{" "}
                  not recorded
                </p>
                <small className="helper">
                  Department totals for the selected academic year.
                </small>
              </Panel>
            );
          })}
        </div>
      )}
      <Panel>
        <SectionHead
          eyebrow="THE ROTATION REGISTER"
          title="Your rotations"
          action={
            <button
              className="text-button"
              onClick={() => setEditor({ type: "rotations" })}
            >
              <Plus size={16} /> Add rotation
            </button>
          }
        />
        {rotations.length ? (
          <div className="management-list">
            {rotations.map((r) => {
              const a = attendance(
                recordedSessions(state, {
                  rotationId: r.id,
                  yearId: state.currentYearId,
                }),
              );
              const p = projection(
                recordedSessions(state, { rotationId: r.id }),
                r.target,
              );
              return (
                <div className="management-row" key={r.id}>
                  <div className="rotation-date">
                    <CalendarRange size={23} />
                  </div>
                  <div className="grow">
                    <h3>
                      {r.name}
                      {r.archived && <span className="pill">Archived</span>}
                    </h3>
                    <p>
                      {
                        state.departments.find((d) => d.id === r.departmentId)
                          ?.name
                      }{" "}
                      · {formatDate(r.start)} – {formatDate(r.end)}
                    </p>
                    <small>
                      {r.weekdays.map((d) => days[d]).join(", ")} · {r.time} ·
                      Target {r.target}%
                    </small>
                    {a.percent !== null && a.percent < r.target && (
                      <small className="crimson">
                        {p.needed === Infinity
                          ? "100% cannot be recovered by adding sessions"
                          : `${p.needed} consecutive attended sessions to target`}
                      </small>
                    )}
                  </div>
                  <div className="rotation-stats">
                    <b>{pct(a.percent)}</b>
                    <small>
                      {a.attended}/{a.eligible} attended
                    </small>
                  </div>
                  <RowActions
                    archived={r.archived}
                    onEdit={() => setEditor({ type: "rotations", item: r })}
                    onArchive={() => archive("rotations", r)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <Empty title="No rotations yet">
            Add a department first, then set each rotation’s confirmed dates,
            weekdays, time, and target. Each rotation creates an independent
            clinical session.
          </Empty>
        )}
      </Panel>
      {editor && (
        <Editor
          {...editor}
          state={state}
          commit={commit}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
export function TimetableView({
  state,
  commit,
}: {
  state: State;
  commit: Commit;
}) {
  const [editor, setEditor] = useState<{
    type: "slots" | "exceptions";
    item?: Editable;
  } | null>(null);
  const [day, setDay] = useState(1);
  const [showArchived, setShowArchived] = useState(false);
  const slots = state.slots
    .filter(
      (s) =>
        s.yearId === state.currentYearId &&
        s.weekday === day &&
        (showArchived || !s.archived),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const rules = state.exceptions.filter(
    (e) => e.yearId === state.currentYearId,
  );
  return (
    <>
      <PageIntro
        tag="DESIGN YOUR RHYTHM"
        title="Timetable & breaks"
        description="Set the weekly pattern. Make room for real life."
        action={
          <button
            className="button primary"
            onClick={() => setEditor({ type: "slots" })}
          >
            <Plus size={17} /> Add weekly class
          </button>
        }
      />
      <div className="info-strip">
        <CalendarRange size={18} />
        <span>
          Nothing is pre-scheduled. Add each lecture or practical separately,
          including multiple sessions of the same subject on a day.
        </span>
      </div>
      <Panel>
        <SectionHead
          eyebrow="YOUR REPEATABLE ROUTINE"
          title="Weekly timetable"
        />
        <div className="tabs weekdays">
          {[1, 2, 3, 4, 5, 6, 0].map((i) => (
            <button
              key={i}
              className={day === i ? "active" : ""}
              onClick={() => setDay(i)}
            >
              {days[i]}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />{" "}
          Show archived classes
        </label>
        {slots.length ? (
          <div className="management-list">
            {slots.map((s) => (
              <div className="management-row" key={s.id}>
                <span className="schedule-time">{s.time}</span>
                <div className="grow">
                  <span className={`session-kind ${s.kind}`}>
                    {kindLabel[s.kind]}
                    {s.archived && " · ARCHIVED"}
                  </span>
                  <h3>
                    {state.subjects.find((x) => x.id === s.subjectId)?.name}
                  </h3>
                  <p>{s.label || "Individual session"}</p>
                  <small>
                    {formatDate(s.from)} – {formatDate(s.to)}
                  </small>
                </div>
                <RowActions
                  archived={s.archived}
                  onEdit={() => setEditor({ type: "slots", item: s })}
                  onArchive={() =>
                    commit(
                      {
                        ...state,
                        slots: state.slots.map((x) =>
                          x.id === s.id ? { ...x, archived: !x.archived } : x,
                        ),
                      },
                      "Timetable updated",
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <Empty title={`No ${days[day]} classes configured`}>
            Add your confirmed classes. Changes generate sessions on unsaved
            dates and preserve saved history.
          </Empty>
        )}
      </Panel>
      <Panel>
        <SectionHead
          eyebrow="EXCEPTIONS ARE PART OF THE STORY"
          title="Holidays & special dates"
          action={
            <button
              className="text-button"
              onClick={() => setEditor({ type: "exceptions" })}
            >
              <Plus size={16} /> Add date rule
            </button>
          }
        />
        {rules.length ? (
          <div className="management-list">
            {rules.map((r) => (
              <div className="management-row" key={r.id}>
                <div className="rotation-date">
                  <CalendarRange size={22} />
                </div>
                <div className="grow">
                  <h3>{r.name}</h3>
                  <p>
                    {formatDate(r.start)} – {formatDate(r.end)}
                  </p>
                  <small>
                    {r.type === "working"
                      ? `Special working · follow ${days[r.weekday]}`
                      : r.type === "holiday"
                        ? "Holiday / break"
                        : "College cancellation"}{" "}
                    · {r.scope === "all" ? "All types" : kindLabel[r.scope]}
                    {r.entityId &&
                      ` · ${[...state.subjects, ...state.departments].find((x) => x.id === r.entityId)?.name}`}
                  </small>
                </div>
                <div className="inline-actions">
                  <button
                    className="icon-button"
                    aria-label={`Edit ${r.name}`}
                    onClick={() => setEditor({ type: "exceptions", item: r })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${r.name}`}
                    onClick={() => {
                      if (
                        confirm(
                          "Remove this date rule? Saved days will stay unchanged.",
                        )
                      )
                        void commit(
                          {
                            ...state,
                            exceptions: state.exceptions.filter(
                              (x) => x.id !== r.id,
                            ),
                          },
                          "Date rule removed",
                        );
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="Your college sets the dates">
            Add Christmas, Sankranti, college cancellations, or any custom date
            range after dates are confirmed. No official dates are assumed.
          </Empty>
        )}
        <p className="helper">
          Special working days use the weekday you choose. Closures take
          priority. To apply a new rule to an already saved date, open it and
          choose “Rebuild from schedule”.
        </p>
      </Panel>
      {editor && (
        <Editor
          {...editor}
          state={state}
          commit={commit}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
export function RowActions({
  onEdit,
  onArchive,
  archived,
}: {
  onEdit: () => void;
  onArchive: () => void;
  archived: boolean;
}) {
  return (
    <div className="inline-actions">
      <button
        className="icon-button"
        aria-label="Edit"
        title="Edit"
        onClick={onEdit}
      >
        <Pencil size={16} />
      </button>
      <button
        className="icon-button"
        aria-label={archived ? "Restore archived item" : "Archive"}
        title={archived ? "Restore" : "Archive (history preserved)"}
        onClick={onArchive}
      >
        {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
      </button>
    </div>
  );
}
