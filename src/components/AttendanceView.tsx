import { useState } from "react";
import {
  Download,
  ArrowUpRight,
  BookOpen,
  Activity,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Kind, State } from "../domain/model";
import {
  attendance,
  attendanceCSV,
  kindLabel,
  pct,
  projection,
  recordedSessions,
} from "../domain/attendance";
import { shiftDate, today, weekday } from "../domain/model";
import { downloadFile } from "../storage/db";
import { Empty, Field, formatDate, PageIntro, Panel, SectionHead } from "./ui";
export function AttendanceView({
  state,
  onDate,
}: {
  state: State;
  onDate: (date: string) => void;
}) {
  const [tab, setTab] = useState("overview");
  const [entity, setEntity] = useState("");
  const [kind, setKind] = useState<Kind>("lecture");
  const [futureA, setFutureA] = useState(0);
  const [futureM, setFutureM] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [chartKind, setChartKind] = useState<Kind>("lecture");
  const [chartEntity, setChartEntity] = useState("");
  const year = state.years.find((y) => y.id === state.currentYearId)!;
  const subjects = state.subjects.filter((s) => s.yearId === year.id);
  const choices = kind === "clinical" ? state.departments : subjects;
  const selected = choices.find((s) => s.id === entity) ?? choices[0];
  const selectedId = selected?.id ?? "";
  const all = recordedSessions(state, {
    yearId: year.id,
    entityId: selectedId,
    kind,
  });
  const target =
    kind === "clinical"
      ? (state.departments.find((x) => x.id === selectedId)?.target ?? 75)
      : ((kind === "lecture"
          ? subjects.find((x) => x.id === selectedId)?.lectureTarget
          : subjects.find((x) => x.id === selectedId)?.practicalTarget) ?? 75);
  const whatif = projection(all, target, futureA, futureM);
  const register = Object.values(state.days)
    .filter((d) => (!from || d.date >= from) && (!to || d.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((d) =>
      d.sessions
        .filter((s) => s.yearId === year.id)
        .map((s) => ({ date: d.date, s })),
    );
  return (
    <>
      <PageIntro
        tag="KNOW YOUR NUMBERS"
        title="Attendance command"
        description="Separate records. Clear targets. No invented absences."
        action={
          <button
            className="button secondary"
            onClick={() =>
              downloadFile(
                attendanceCSV(state),
                `arc-attendance-${today()}.csv`,
                "text/csv;charset=utf-8",
              )
            }
          >
            <Download size={16} /> Export CSV
          </button>
        }
      />
      <div className="tabs page-tabs">
        {["overview", "register", "what-if"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "what-if"
              ? "What if?"
              : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <>
          <div className="info-strip">
            <Activity size={17} />
            <span>
              Targets start at 75% lecture / 80% practical as editable
              placeholders. Confirm your college’s rules in Settings. Aggregate
              cards never replace subject requirements.
            </span>
          </div>
          <div className="subject-stats-grid">
            {subjects.map((s, i) => (
              <Panel key={s.id} className="subject-stat">
                <div className="subject-stat-head">
                  <div className={`subject-mark color-${i % 3}`}>
                    <BookOpen size={20} />
                  </div>
                  <h2>
                    {s.name}
                    {s.archived && <small>Archived</small>}
                  </h2>
                </div>
                {(["lecture", "practical"] as Kind[]).map((k) => {
                  const sessions = recordedSessions(state, {
                    yearId: year.id,
                    entityId: s.id,
                    kind: k,
                  });
                  const a = attendance(sessions);
                  const target =
                    k === "lecture" ? s.lectureTarget : s.practicalTarget;
                  const p = projection(sessions, target);
                  return (
                    <div className="stat-category" key={k}>
                      <div className="between">
                        <b>{kindLabel[k]}</b>
                        <span
                          className={
                            a.percent !== null && a.percent < target
                              ? "crimson"
                              : "cyan"
                          }
                        >
                          {pct(a.percent)}
                        </span>
                      </div>
                      <div className="track">
                        <i
                          className={
                            a.percent !== null && a.percent < target
                              ? "warn"
                              : ""
                          }
                          style={{ width: `${a.percent ?? 0}%` }}
                        />
                        <em style={{ left: `${target}%` }} />
                      </div>
                      <div className="between small muted">
                        <span>
                          {a.attended} attended / {a.eligible} eligible
                        </span>
                        <span>Target {target}%</span>
                      </div>
                      <p className="stat-warning">
                        {a.percent === null
                          ? "Your first record starts the story."
                          : a.percent < target
                            ? `${p.needed === Infinity ? "All absences must be corrected; a 100% target cannot be recovered by adding sessions." : `${p.needed} consecutive attended sessions needed to reach target.`}`
                            : a.percent < target + state.settings.warningMargin
                              ? "Close to target. Keep a little breathing room."
                              : `${p.canMiss} future absence${p.canMiss === 1 ? "" : "s"} possible at this target.`}
                      </p>
                      <small className="muted">
                        {a.unrecorded} not recorded · {a.cancelled} cancelled
                        (excluded)
                      </small>
                    </div>
                  );
                })}
              </Panel>
            ))}
          </div>
          <Panel className="chart-panel">
            <SectionHead eyebrow="YOUR PROGRESS" title="Last 8 weeks" />
            <div className="form-grid">
              <Field label="Chart session type">
                <select
                  value={chartKind}
                  onChange={(e) => {
                    setChartKind(e.target.value as Kind);
                    setChartEntity("");
                  }}
                >
                  {(["lecture", "practical", "clinical"] as Kind[]).map((k) => (
                    <option value={k} key={k}>
                      {kindLabel[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Chart subject / department">
                <select
                  value={chartEntity}
                  onChange={(e) => setChartEntity(e.target.value)}
                >
                  <option value="">
                    All {chartKind === "clinical" ? "departments" : "subjects"}
                  </option>
                  {(chartKind === "clinical"
                    ? state.departments
                    : subjects
                  ).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <ProgressChart
              state={state}
              kind={chartKind}
              entityId={chartEntity}
            />
            <p className="helper">
              Saved attended ÷ eligible sessions in each week. Empty weeks have
              no percentage. Clinical statistics are available in Clinical.
            </p>
          </Panel>
        </>
      )}
      {tab === "register" && (
        <Panel>
          <SectionHead
            eyebrow="THE COMPLETE RECORD"
            title="Attendance register"
          />
          <div className="form-grid filter-dates">
            <Field label="From">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>
          {register.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject / department</th>
                    <th>Type</th>
                    <th>Session</th>
                    <th>Status</th>
                    <th>Correct</th>
                  </tr>
                </thead>
                <tbody>
                  {register.map(({ date, s }) => (
                    <tr key={`${date}-${s.id}`}>
                      <td>{formatDate(date)}</td>
                      <td>{s.name}</td>
                      <td>{kindLabel[s.kind]}</td>
                      <td>
                        {s.time}
                        <small>{s.label}</small>
                      </td>
                      <td>
                        <span className={`status-text ${s.status}`}>
                          {s.status === "unrecorded"
                            ? "Not recorded"
                            : s.status}
                        </span>
                        {s.reason && <small>{s.reason}</small>}
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${date} ${s.name}`}
                          onClick={() => onDate(date)}
                        >
                          <History size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Your record starts with a saved day">
              Save a daily checklist to see each session here. Date filters
              apply to this table; CSV exports your complete saved register.
            </Empty>
          )}
        </Panel>
      )}
      {tab === "what-if" && (
        <Panel className="what-if">
          <SectionHead
            eyebrow="PLAN THE NEXT MOVE"
            title="Attendance simulator"
          />
          <p className="muted">
            Explore the effect of future sessions. This does not change your
            records.
          </p>
          <div className="form-grid">
            <Field label="Session type">
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as Kind);
                  setEntity("");
                }}
              >
                {(["lecture", "practical", "clinical"] as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {kindLabel[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject / department">
              <select
                value={selectedId}
                onChange={(e) => setEntity(e.target.value)}
              >
                {!choices.length && (
                  <option value="">Add a department first</option>
                )}
                {choices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Future attended sessions">
              <input
                type="number"
                min="0"
                max="10000"
                step="1"
                value={futureA}
                onChange={(e) =>
                  setFutureA(
                    Math.max(
                      0,
                      Math.min(10000, Math.floor(Number(e.target.value))),
                    ),
                  )
                }
              />
            </Field>
            <Field label="Future absent sessions">
              <input
                type="number"
                min="0"
                max="10000"
                step="1"
                value={futureM}
                onChange={(e) =>
                  setFutureM(
                    Math.max(
                      0,
                      Math.min(10000, Math.floor(Number(e.target.value))),
                    ),
                  )
                }
              />
            </Field>
          </div>
          <div className="simulation-result">
            <div>
              <span className="eyebrow">PROJECTED ATTENDANCE</span>
              <strong>{selected ? pct(whatif.percent) : "—"}</strong>
            </div>
            <ArrowUpRight size={32} />
            <div>
              <span className="eyebrow">YOUR TARGET</span>
              <strong>{target}%</strong>
            </div>
          </div>
          <p className="helper">
            From your current saved record:{" "}
            {whatif.needed === Infinity
              ? "a 100% target cannot be reached by adding sessions after an absence."
              : `${whatif.needed} consecutive attended sessions to reach target; ${whatif.canMiss} future absences possible at the target.`}
          </p>
        </Panel>
      )}
    </>
  );
}
function ProgressChart({
  state,
  kind,
  entityId,
}: {
  state: State;
  kind: Kind;
  entityId: string;
}) {
  const current = today();
  const start = shiftDate(current, -((weekday(current) + 6) % 7) - 49);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const from = shiftDate(start, i * 7);
    return { from, to: shiftDate(from, 6) };
  });
  return (
    <div className="chart">
      {weeks.map((w) => {
        const a = attendance(
          recordedSessions(state, {
            yearId: state.currentYearId,
            kind,
            entityId,
            ...w,
          }),
        );
        return (
          <div
            className="chart-column"
            key={w.from}
            title={`${formatDate(w.from)}: ${pct(a.percent)}, ${a.attended}/${a.eligible}`}
          >
            <span>{pct(a.percent)}</span>
            <div className="chart-bar-wrap">
              <div
                style={{ height: `${a.percent ?? 0}%` }}
                className={a.percent === null ? "no-data" : ""}
              />
            </div>
            <small>
              {formatDate(w.from, { day: "numeric", month: "short" })}
            </small>
          </div>
        );
      })}
    </div>
  );
}
export function CalendarView({
  state,
  onDate,
  initialDate = today(),
}: {
  state: State;
  onDate: (date: string) => void;
  initialDate?: string;
}) {
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const first = `${month}-01`;
  const start = shiftDate(first, -((weekday(first) + 6) % 7));
  const dates = Array.from({ length: 42 }, (_, i) => shiftDate(start, i));
  const changeMonth = (n: number) => {
    const d = new Date(`${first}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  };
  return (
    <>
      <PageIntro
        tag="EVERY DAY IS A PANEL"
        title="Your timeline"
        description="Open any date to log, review, or correct your story."
      />
      <Panel className="calendar-panel">
        <SectionHead
          title={formatDate(first, { month: "long", year: "numeric" })}
          action={
            <div className="inline-actions">
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="text-button"
                onClick={() => setMonth(today().slice(0, 7))}
              >
                Today
              </button>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          }
        />
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span className="calendar-weekday" key={d}>
              {d}
            </span>
          ))}
          {dates.map((date) => {
            const day = state.days[date];
            const sessions =
              day?.sessions.filter((s) => s.yearId === state.currentYearId) ??
              [];
            const a = attendance(sessions);
            const closures = state.exceptions.filter(
              (e) =>
                e.yearId === state.currentYearId &&
                e.start <= date &&
                e.end >= date,
            );
            const isToday = date === today();
            return (
              <button
                className={`calendar-cell ${date.slice(0, 7) !== month ? "outside" : ""} ${isToday ? "is-today" : ""} ${day ? "logged" : ""}`}
                key={date}
                onClick={() => onDate(date)}
                aria-label={`${formatDate(date)}${day ? ", saved day" : ""}`}
              >
                <span className="calendar-date">
                  {Number(date.slice(-2))}
                  {isToday && <i />}
                </span>
                {day ? (
                  <>
                    <b>{pct(a.percent)}</b>
                    <small>
                      {a.attended}/{a.eligible} attended
                    </small>
                    <div className="calendar-dots">
                      {sessions.slice(0, 9).map((s) => (
                        <i key={s.id} className={s.status} />
                      ))}
                    </div>
                  </>
                ) : (
                  <small className="calendar-unsaved">
                    {closures[0]?.name ?? "Not saved"}
                  </small>
                )}
                {day &&
                  (day.habits.study || day.habits.gym || day.habits.sport) && (
                    <span className="habit-dot" title="Activity logged">
                      +
                    </span>
                  )}
              </button>
            );
          })}
        </div>
        <div className="calendar-key">
          <span>
            <i className="attended" /> Attended
          </span>
          <span>
            <i className="absent" /> Absent
          </span>
          <span>
            <i className="cancelled" /> Cancelled
          </span>
          <span>
            <i className="unrecorded" /> Not recorded
          </span>
        </div>
        <p className="helper">
          Percentages combine saved sessions for the selected academic year on
          each date. Use Attendance for separate subject/type requirements.
          Holiday labels show configured date rules; saved days retain their
          original snapshot.
        </p>
      </Panel>
      <Panel>
        <SectionHead eyebrow="CORRECT THE PAST" title="REWIND" />
        <p className="muted">
          Open a date above, change any session, then press SAVE DAY. To undo
          your latest save for a date, use the Rewind history in Settings.
        </p>
      </Panel>
    </>
  );
}
