import type { Day, Exception, Kind, Session, State } from "./model";
import { uid, weekday } from "./model";
export const kindLabel: Record<Kind, string> = {
  lecture: "Lecture",
  practical: "Practical",
  clinical: "Clinical",
};
function applies(e: Exception, s: Session) {
  return (
    (e.scope === "all" || e.scope === s.kind) &&
    (!e.entityId || e.entityId === s.entityId)
  );
}
export function generateDay(state: State, date: string): Day {
  const sessions: Session[] = [];
  for (const year of state.years) {
    if (date < year.start || date > year.end) continue;
    const overrides = state.exceptions.filter(
      (e) => e.yearId === year.id && e.start <= date && e.end >= date,
    );
    const working = overrides.filter((e) => e.type === "working");
    for (const slot of state.slots) {
      if (
        slot.yearId !== year.id ||
        slot.archived ||
        date < slot.from ||
        date > slot.to
      )
        continue;
      const subject = state.subjects.find((x) => x.id === slot.subjectId);
      if (!subject || subject.archived) continue;
      const session: Session = {
        id: `slot:${slot.id}`,
        yearId: year.id,
        entityId: subject.id,
        rotationId: "",
        rotationName: "",
        name: subject.name,
        kind: slot.kind,
        time: slot.time,
        label: slot.label,
        status: "unrecorded",
        source: "timetable",
        reason: "",
      };
      const replacement = working.filter((e) => applies(e, session)).at(-1);
      if (slot.weekday !== (replacement ? replacement.weekday : weekday(date)))
        continue;
      const closure = overrides
        .filter((e) => e.type !== "working" && applies(e, session))
        .at(-1);
      if (closure) {
        session.status = "cancelled";
        session.reason = closure.name;
      }
      sessions.push(session);
    }
    for (const r of state.rotations) {
      if (r.yearId !== year.id || r.archived || date < r.start || date > r.end)
        continue;
      const dep = state.departments.find((x) => x.id === r.departmentId);
      if (!dep || dep.archived) continue;
      const session: Session = {
        id: `rotation:${r.id}`,
        yearId: year.id,
        entityId: dep.id,
        rotationId: r.id,
        rotationName: r.name,
        name: dep.name,
        kind: "clinical",
        time: r.time,
        label: r.name,
        status: "unrecorded",
        source: "rotation",
        reason: "",
      };
      const replacement = working.filter((e) => applies(e, session)).at(-1);
      if (
        !r.weekdays.includes(replacement ? replacement.weekday : weekday(date))
      )
        continue;
      const closure = overrides
        .filter((e) => e.type !== "working" && applies(e, session))
        .at(-1);
      if (closure) {
        session.status = "cancelled";
        session.reason = closure.name;
      }
      sessions.push(session);
    }
  }
  return {
    date,
    sessions: sessions.sort((a, b) => a.time.localeCompare(b.time)),
    habits: { study: false, gym: false, sport: false },
    note: "",
    savedAt: new Date().toISOString(),
  };
}
export function saveDay(state: State, day: Day): State {
  return {
    ...state,
    days: {
      ...state.days,
      [day.date]: {
        ...structuredClone(day),
        savedAt: new Date().toISOString(),
      },
    },
    revisions: [
      ...state.revisions,
      {
        id: uid(),
        date: day.date,
        at: new Date().toISOString(),
        previous: state.days[day.date]
          ? structuredClone(state.days[day.date])
          : null,
      },
    ].slice(-100),
  };
}
export function rewind(state: State, revisionId: string): State {
  const rev = state.revisions.find((x) => x.id === revisionId);
  if (!rev) throw new Error("Rewind entry no longer available");
  if (state.revisions.filter((x) => x.date === rev.date).at(-1)?.id !== rev.id)
    throw new Error("Undo the latest save for this date first");
  const days = { ...state.days };
  if (rev.previous) days[rev.date] = structuredClone(rev.previous);
  else delete days[rev.date];
  return {
    ...state,
    days,
    revisions: state.revisions.filter((x) => x.id !== revisionId),
  };
}
export type Filter = {
  yearId?: string;
  entityId?: string;
  kind?: Kind;
  rotationId?: string;
  from?: string;
  to?: string;
};
export function recordedSessions(state: State, filter: Filter = {}): Session[] {
  return Object.values(state.days)
    .filter(
      (d) =>
        (!filter.from || d.date >= filter.from) &&
        (!filter.to || d.date <= filter.to),
    )
    .flatMap((d) => d.sessions)
    .filter(
      (s) =>
        (!filter.yearId || s.yearId === filter.yearId) &&
        (!filter.entityId || s.entityId === filter.entityId) &&
        (!filter.kind || s.kind === filter.kind) &&
        (!filter.rotationId || s.rotationId === filter.rotationId),
    );
}
export function attendance(sessions: Session[]) {
  const attended = sessions.filter((s) => s.status === "attended").length,
    absent = sessions.filter((s) => s.status === "absent").length;
  return {
    attended,
    absent,
    eligible: attended + absent,
    percent: attended + absent ? (attended / (attended + absent)) * 100 : null,
    cancelled: sessions.filter((s) => s.status === "cancelled").length,
    unrecorded: sessions.filter((s) => s.status === "unrecorded").length,
  };
}
export function projection(
  sessions: Session[],
  target: number,
  attend = 0,
  miss = 0,
) {
  const { attended, eligible } = attendance(sessions),
    total = eligible + attend + miss;
  const fraction = target / 100;
  return {
    percent: total ? ((attended + attend) / total) * 100 : null,
    needed:
      target === 100
        ? eligible === attended
          ? 0
          : Infinity
        : Math.max(
            0,
            Math.ceil((fraction * eligible - attended) / (1 - fraction) - 1e-9),
          ),
    canMiss: Math.max(0, Math.floor(attended / fraction - eligible + 1e-9)),
  };
}
export const pct = (n: number | null) =>
  n === null ? "—" : `${n.toFixed(1)}%`;
const csvCell = (s: string) =>
  `"${(/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
export function attendanceCSV(state: State) {
  const lines = [
    [
      "Date",
      "Academic year",
      "Subject / department",
      "Type",
      "Rotation",
      "Time",
      "Session",
      "Status",
      "Reason",
    ],
  ];
  Object.values(state.days)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((d) =>
      d.sessions.forEach((s) =>
        lines.push([
          d.date,
          state.years.find((y) => y.id === s.yearId)?.name ?? s.yearId,
          s.name,
          kindLabel[s.kind],
          s.rotationName || (s.rotationId ? s.label : ""),
          s.time,
          s.label,
          s.status,
          s.reason,
        ]),
      ),
    );
  return "\uFEFF" + lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
