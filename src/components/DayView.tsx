import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Save,
  RotateCcw,
  BookOpen,
  Dumbbell,
  Footprints,
  ChevronRight,
  CalendarDays,
  Zap,
  ShieldCheck,
} from "lucide-react";
import type { Day, Kind, Session, State, Status } from "../domain/model";
import { uid, shiftDate, today, statuses } from "../domain/model";
import {
  attendance,
  kindLabel,
  pct,
  recordedSessions,
} from "../domain/attendance";
import { Dialog, Empty, Field, formatDate, Panel, SectionHead } from "./ui";
export function DayView({
  state,
  day,
  onChange,
  onDate,
  onSave,
  onRefresh,
  busy,
  dirty,
  onNavigate,
}: {
  state: State;
  day: Day;
  onChange: (day: Day) => void;
  onDate: (date: string) => void;
  onSave: () => void;
  onRefresh: () => void;
  busy: boolean;
  dirty: boolean;
  onNavigate: (view: string) => void;
}) {
  const [add, setAdd] = useState(false);
  const [type, setType] = useState<Kind>("lecture");
  const [entityId, setEntityId] = useState("");
  const [filter, setFilter] = useState("all");
  const year = state.years.find((y) => y.id === state.currentYearId)!;
  const sessions = day.sessions.filter(
    (s) => filter === "all" || s.kind === filter,
  );
  const recorded = day.sessions.filter(
    (s) => s.status === "attended" || s.status === "absent",
  ).length;
  const setStatus = (id: string, status: Status) =>
    onChange({
      ...day,
      sessions: day.sessions.map((s) =>
        s.id === id
          ? { ...s, status, reason: status === "cancelled" ? s.reason : "" }
          : s,
      ),
    });
  const total = attendance(recordedSessions(state, { yearId: year.id }));
  const subjects = state.subjects.filter(
    (s) => s.yearId === year.id && !s.archived,
  );
  const remaining = day.sessions.filter(
    (s) => s.status === "unrecorded",
  ).length;
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-tag">
            <span className="live-dot" /> ACADEMY 1.0{" "}
            <span className="tag-slash">//</span> THE ORIGIN
          </div>
          <h1>
            Every day writes
            <br />
            your <span>story.</span>
          </h1>
          <p>Show up. Put in the work. Build your own origin.</p>
          <div className="hero-meta">
            <span>
              <CalendarDays size={14} /> 02 NOV 2026 · THE BEGINNING
            </span>
            <span>WARANGAL, INDIA</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="crosshair crosshair-one" />
          <div className="crosshair crosshair-two" />
          <svg className="hero-a" viewBox="0 0 240 240">
            <defs>
              <linearGradient id="red" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#ff5974" />
                <stop offset="1" stopColor="#a30f32" />
              </linearGradient>
            </defs>
            <path
              d="m30 193 78-155h34L69 193zM151 79l61 114h-50l-34-65z"
              fill="url(#red)"
            />
            <path d="m96 166 22-40 22 40z" fill="#8eebe9" />
          </svg>
          <span className="art-caption">PROTOCOL_01 / BECOME</span>
          <span className="art-corner">ORIGIN // ARC SYSTEM</span>
        </div>
      </section>
      <div className="metric-grid">
        {(["lecture", "practical", "clinical"] as Kind[]).map((kind, i) => {
          const a = attendance(
            recordedSessions(state, { yearId: year.id, kind }),
          );
          return (
            <Panel key={kind} className={`metric metric-${i}`}>
              <div className="metric-top">
                <span className="eyebrow">{kindLabel[kind]} attendance</span>
                <span className="metric-number">0{i + 1}</span>
              </div>
              <div className="metric-value">
                {pct(a.percent)}
                <span>
                  {a.eligible
                    ? `${a.attended} / ${a.eligible} attended`
                    : "No recorded sessions"}
                </span>
              </div>
              <div className="track">
                <i style={{ width: `${a.percent ?? 0}%` }} />
              </div>
              <small>
                {kind === "clinical"
                  ? "Each posting tracked independently"
                  : "Each subject tracked independently"}
              </small>
            </Panel>
          );
        })}
        <Panel className="metric metric-story">
          <div className="metric-top">
            <span className="eyebrow">Your story so far</span>
            <Zap size={17} />
          </div>
          <div className="metric-value">
            {
              Object.values(state.days).filter(
                (d) =>
                  d.sessions.some((s) => s.yearId === year.id) ||
                  (!d.sessions.length &&
                    d.date >= year.start &&
                    d.date <= year.end),
              ).length
            }
            <span>days saved this academic year</span>
          </div>
          <small>
            <span className="cyan">{total.attended}</span> sessions you showed
            up for
          </small>
        </Panel>
      </div>
      <div className="today-layout">
        <div>
          <Panel className="daily-panel">
            <SectionHead
              eyebrow="YOUR DAILY MISSION"
              title={
                day.date === today() ? "Today's lineup" : "Your daily lineup"
              }
              action={
                <button className="text-button" onClick={() => setAdd(true)}>
                  <Plus size={16} /> Add session
                </button>
              }
            />
            <div className="day-toolbar">
              <div className="date-control">
                <button
                  className="icon-button"
                  aria-label="Previous day"
                  onClick={() => onDate(shiftDate(day.date, -1))}
                >
                  <ArrowLeft size={17} />
                </button>
                <label className="date-label">
                  {formatDate(day.date, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  <input
                    aria-label="Log date"
                    type="date"
                    value={day.date}
                    onChange={(e) => e.target.value && onDate(e.target.value)}
                  />
                </label>
                <button
                  className="icon-button"
                  aria-label="Next day"
                  onClick={() => onDate(shiftDate(day.date, 1))}
                >
                  <ArrowRight size={17} />
                </button>
              </div>
              <span className={`pill ${dirty ? "amber" : ""}`}>
                {dirty
                  ? "Unsaved changes"
                  : state.days[day.date]
                    ? "Day saved"
                    : "Ready to log"}
              </span>
            </div>
            <div className="tabs compact">
              {["all", "lecture", "practical", "clinical"].map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={filter === k ? "active" : ""}
                >
                  {k === "all" ? "All sessions" : kindLabel[k as Kind]}
                </button>
              ))}
            </div>
            {sessions.length === 0 ? (
              <Empty
                title={
                  day.sessions.length
                    ? "No sessions in this category"
                    : "A blank page. Your next chapter."
                }
                action={
                  <button
                    className="button secondary"
                    onClick={() => onNavigate("Timetable")}
                  >
                    Set up your timetable <ChevronRight size={15} />
                  </button>
                }
              >
                {day.sessions.length
                  ? "Choose another session type."
                  : "Add your confirmed weekly classes, or add a one-off session above. No classes or holidays are assumed."}
              </Empty>
            ) : (
              <div className="sessions">
                {sessions.map((s, index) => (
                  <div className={`session-row ${s.status}`} key={s.id}>
                    <div className="session-time">
                      {s.time}
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div className={`subject-mark ${s.kind}`}>
                      <BookOpen size={20} />
                    </div>
                    <div className="session-info">
                      <span className={`session-kind ${s.kind}`}>
                        {kindLabel[s.kind]} {s.rotationId && " / POSTING"}
                      </span>
                      <h3>{s.name}</h3>
                      <p>
                        {s.label || "Individual session"}
                        {s.reason && ` · ${s.reason}`}
                      </p>
                    </div>
                    <div
                      className="status-picker"
                      role="group"
                      aria-label={`${s.name} ${s.kind} ${s.time} status`}
                    >
                      {statuses.map((status) => (
                        <button
                          key={status}
                          aria-pressed={s.status === status}
                          className={
                            s.status === status ? `selected ${status}` : ""
                          }
                          title={
                            status === "unrecorded" ? "Not recorded" : status
                          }
                          onClick={() => setStatus(s.id, status)}
                        >
                          {status === "attended" ? <Check size={15} /> : null}
                          <span>
                            {status === "unrecorded"
                              ? "Not recorded"
                              : status.charAt(0).toUpperCase() +
                                status.slice(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                    {s.source === "manual" && (
                      <button
                        className="remove-session"
                        aria-label={`Remove ${s.name} session`}
                        onClick={() => {
                          if (
                            confirm(
                              "Remove this session from the day? Use Cancelled to keep it in your register.",
                            )
                          )
                            onChange({
                              ...day,
                              sessions: day.sessions.filter(
                                (x) => x.id !== s.id,
                              ),
                            });
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="lineup-footer">
              <span>
                <span className="cyan">{recorded}</span> recorded · {remaining}{" "}
                not recorded
              </span>
              <button className="text-button muted" onClick={onRefresh}>
                <RotateCcw size={13} /> Rebuild from schedule
              </button>
            </div>
          </Panel>
          <Panel className="habits-panel">
            <SectionHead
              eyebrow="SMALL ACTIONS. LONG ARCS."
              title="Beyond the classroom"
            />
            <div className="habits">
              {(
                [
                  {
                    key: "study",
                    title: "Study",
                    sub: "Build your knowledge",
                    icon: BookOpen,
                  },
                  {
                    key: "gym",
                    title: "Gym",
                    sub: "Build your strength",
                    icon: Dumbbell,
                  },
                  {
                    key: "sport",
                    title: "Run / football",
                    sub: "Keep moving",
                    icon: Footprints,
                  },
                ] as const
              ).map(({ key, title, sub, icon: Icon }) => (
                <label
                  className={`habit ${day.habits[key] ? "checked" : ""}`}
                  key={key}
                >
                  <Icon size={20} />
                  <div>
                    <b>{title}</b>
                    <small>{sub}</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={day.habits[key]}
                    onChange={(e) =>
                      onChange({
                        ...day,
                        habits: { ...day.habits, [key]: e.target.checked },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <Field label="A note for your future self">
              <textarea
                rows={2}
                maxLength={3000}
                placeholder="One thing you learned. One small win. Anything worth remembering."
                value={day.note}
                onChange={(e) => onChange({ ...day, note: e.target.value })}
              />
            </Field>
          </Panel>
          <div className="save-bar">
            <span>
              <ShieldCheck size={17} /> Saved on this device. Yours to keep.
            </span>
            <button
              className="button primary save-button"
              disabled={busy}
              onClick={onSave}
            >
              <Save size={17} />
              {busy ? "SAVING…" : "SAVE DAY"}
              <span>↗</span>
            </button>
          </div>
        </div>
        <aside className="today-aside">
          <Panel className="chapter-card">
            <span className="eyebrow crimson">CURRENT CHAPTER</span>
            <div className="chapter-number">
              {String(
                state.years.findIndex((y) => y.id === year.id) + 1,
              ).padStart(2, "0")}
              <span>/ CHAPTER</span>
            </div>
            <h3>{year.name}</h3>
            <p>
              {formatDate(year.start)} — {formatDate(year.end)}
            </p>
            <div className="chapter-line" />
            <span className="tiny-label">YOUR CORE SUBJECTS</span>
            {subjects.map((s, i) => (
              <div className="core-subject" key={s.id}>
                <span className={`subject-dot color-${i % 3}`} />
                {s.name}
                <ChevronRight size={13} />
              </div>
            ))}
            <button
              className="text-button"
              onClick={() => onNavigate("Settings")}
            >
              Customize your academy <ChevronRight size={14} />
            </button>
          </Panel>
          <Panel className="protocol-note">
            <div className="protocol-icon">
              <ShieldCheck size={21} />
            </div>
            <h3>Accuracy is the protocol.</h3>
            <p>
              Only saved <b>Attended</b> and <b>Absent</b> sessions count. Not
              recorded and cancelled sessions never lower your attendance.
            </p>
            <button
              className="text-button"
              onClick={() => onNavigate("Attendance")}
            >
              Open attendance <ChevronRight size={14} />
            </button>
          </Panel>
          <div className="aside-quote">
            <span>“</span>
            <p>
              You don’t become who you are
              <br />
              in a single day.
              <br />
              <b>You become, every day.</b>
            </p>
            <small>ARC // THE ORIGIN BEGINS</small>
          </div>
        </aside>
      </div>
      {add && (
        <Dialog title="Add a session" onClose={() => setAdd(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const entityId = String(f.get("entity"));
              const rotationId = String(f.get("rotation") || "");
              const dep = state.departments.find((d) => d.id === entityId);
              const subject = state.subjects.find((s) => s.id === entityId);
              const session: Session = {
                id: `manual:${uid()}`,
                yearId: year.id,
                entityId,
                rotationId,
                rotationName:
                  state.rotations.find((r) => r.id === rotationId)?.name ?? "",
                name: (type === "clinical" ? dep : subject)!.name,
                kind: type,
                time: String(f.get("time")),
                label: String(f.get("label")),
                status: "unrecorded",
                source: "manual",
                reason: "",
              };
              onChange({
                ...day,
                sessions: [...day.sessions, session].sort((a, b) =>
                  a.time.localeCompare(b.time),
                ),
              });
              setAdd(false);
            }}
          >
            <Field label="Session type">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as Kind);
                  setEntityId("");
                }}
              >
                {(["lecture", "practical", "clinical"] as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {kindLabel[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={type === "clinical" ? "Department" : "Subject"}>
              <select
                required
                name="entity"
                key={type}
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              >
                <option value="">Choose…</option>
                {(type === "clinical"
                  ? state.departments.filter((d) => !d.archived)
                  : subjects
                ).map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            {type === "clinical" && (
              <ClinicalRotationChoice
                state={state}
                yearId={year.id}
                department={entityId}
                key={entityId}
              />
            )}
            <div className="form-grid">
              <Field label="Time">
                <input required type="time" name="time" defaultValue="09:00" />
              </Field>
              <Field label="Session label">
                <input
                  name="label"
                  maxLength={160}
                  placeholder="e.g. Second lecture"
                />
              </Field>
            </div>
            <p className="helper">
              Missing a subject or department? Add it in Settings or Clinical
              first. Multiple sessions of the same subject are supported.
            </p>
            <button className="button primary" type="submit">
              Add to day <Plus size={16} />
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
function ClinicalRotationChoice({
  state,
  yearId,
  department,
}: {
  state: State;
  yearId: string;
  department: string;
}) {
  return (
    <Field label="Rotation (optional)">
      <select name="rotation">
        <option value="">Department only</option>
        {state.rotations
          .filter(
            (r) =>
              r.yearId === yearId &&
              !r.archived &&
              r.departmentId === department,
          )
          .map((r) => (
            <option value={r.id} key={r.id}>
              {r.name}
            </option>
          ))}
      </select>
    </Field>
  );
}
