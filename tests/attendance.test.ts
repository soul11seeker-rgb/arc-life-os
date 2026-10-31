import { describe, expect, it } from "vitest";
import {
  attendance,
  attendanceCSV,
  generateDay,
  pct,
  projection,
  recordedSessions,
  rewind,
  saveDay,
} from "../src/domain/attendance";
import { initialState, parseState } from "../src/domain/model";
import type { Kind, Slot, State } from "../src/domain/model";
function slot(id: string, kind: Kind = "lecture", time = "09:00"): Slot {
  return {
    id,
    yearId: "mbbs-2",
    subjectId: "subject-0",
    kind: kind as Slot["kind"],
    weekday: 1,
    time,
    label: id,
    from: "2026-11-02",
    to: "2027-11-01",
    archived: false,
  };
}
function scheduled() {
  const s = initialState();
  s.slots = [
    slot("one"),
    slot("two", "practical", "14:00"),
    slot("three", "lecture", "10:00"),
  ];
  return s;
}
function markAll(
  state: State,
  date: string,
  marks: ("attended" | "absent" | "cancelled" | "unrecorded")[],
) {
  const day = generateDay(state, date);
  day.sessions.forEach((s, i) => (s.status = marks[i] ?? "unrecorded"));
  return saveDay(state, day);
}
describe("Attendance correctness", () => {
  it("starts with real subjects, no invented timetable, holidays or records", () => {
    const s = initialState();
    expect(s.subjects.map((x) => x.name)).toEqual([
      "Pharmacology",
      "Microbiology",
      "Pathology",
    ]);
    expect(s.slots).toEqual([]);
    expect(s.exceptions).toEqual([]);
    expect(s.departments).toEqual([]);
    expect(attendance(recordedSessions(s)).percent).toBeNull();
    expect(generateDay(s, "2026-11-02").sessions).toEqual([]);
  });
  it("separates lectures and practicals for each subject", () => {
    let s = scheduled();
    s.slots.push({ ...slot("other"), subjectId: "subject-1" });
    s = markAll(s, "2026-11-02", ["attended", "attended", "absent", "absent"]);
    expect(
      attendance(
        recordedSessions(s, { entityId: "subject-0", kind: "lecture" }),
      ),
    ).toMatchObject({ attended: 1, absent: 1, percent: 50 });
    expect(
      attendance(
        recordedSessions(s, { entityId: "subject-0", kind: "practical" }),
      ).percent,
    ).toBe(0);
    expect(
      attendance(
        recordedSessions(s, { entityId: "subject-1", kind: "lecture" }),
      ).percent,
    ).toBe(100);
  });
  it("independently retains multiple same-subject lectures on one day", () => {
    const s = markAll(scheduled(), "2026-11-02", [
      "attended",
      "absent",
      "cancelled",
    ]);
    const a = attendance(recordedSessions(s));
    expect(s.days["2026-11-02"].sessions).toHaveLength(3);
    expect(new Set(s.days["2026-11-02"].sessions.map((x) => x.id)).size).toBe(
      3,
    );
    expect(a).toMatchObject({
      attended: 1,
      absent: 1,
      cancelled: 1,
      percent: 50,
    });
  });
  it("never treats unrecorded or cancelled sessions as absence", () => {
    const s = markAll(scheduled(), "2026-11-02", [
      "unrecorded",
      "cancelled",
      "unrecorded",
    ]);
    expect(attendance(recordedSessions(s))).toEqual({
      attended: 0,
      absent: 0,
      eligible: 0,
      percent: null,
      cancelled: 1,
      unrecorded: 2,
    });
    expect(pct(null)).toBe("—");
  });
  it("uses only saved sessions, never inferred missed dates", () => {
    const s = scheduled();
    generateDay(s, "2026-11-02");
    expect(recordedSessions(s)).toHaveLength(0);
    const saved = markAll(s, "2026-11-02", ["attended"]);
    expect(attendance(recordedSessions(saved))).toMatchObject({
      eligible: 1,
      percent: 100,
      absent: 0,
    });
  });
  it("calculates targets, recovery, absence allowance and what-if without changing records", () => {
    const s = markAll(scheduled(), "2026-11-02", [
      "attended",
      "attended",
      "absent",
    ]);
    const list = recordedSessions(s);
    expect(attendance(list).percent).toBeCloseTo(200 / 3);
    expect(projection(list, 75, 1, 0)).toEqual({
      percent: 75,
      needed: 1,
      canMiss: 0,
    });
    expect(projection(list, 100).needed).toBe(Infinity);
    expect(
      projection(
        list.filter((x) => x.status === "attended"),
        75,
      ).canMiss,
    ).toBe(0);
    expect(projection([], 75).needed).toBe(0);
    expect(attendance(list).eligible).toBe(3);
  });
  it("does not round percentages before testing a target", () => {
    const base = generateDay(scheduled(), "2026-11-02").sessions[0];
    const list = Array.from({ length: 13 }, (_, i) => ({
      ...base,
      id: String(i),
      status: i < 10 ? ("attended" as const) : ("absent" as const),
    }));
    expect(attendance(list).percent).toBeCloseTo(76.9230769);
    expect(projection(list, 80).needed).toBe(2);
  });
});
describe("Calendar rules and preserved history", () => {
  it("respects start dates, effective dates and weekdays", () => {
    const s = scheduled();
    expect(generateDay(s, "2026-10-26").sessions).toHaveLength(0);
    expect(generateDay(s, "2026-11-03").sessions).toHaveLength(0);
    s.slots[0].from = "2026-11-09";
    expect(generateDay(s, "2026-11-02").sessions).toHaveLength(2);
  });
  it("applies holidays across inclusive ranges without automatic absences", () => {
    const s = scheduled();
    s.exceptions.push({
      id: "holiday",
      yearId: "mbbs-2",
      name: "Confirmed holiday",
      start: "2026-11-02",
      end: "2026-11-09",
      type: "holiday",
      scope: "all",
      entityId: "",
      weekday: 0,
    });
    for (const date of ["2026-11-02", "2026-11-09"])
      expect(
        generateDay(s, date).sessions.every((x) => x.status === "cancelled"),
      ).toBe(true);
    expect(
      generateDay(s, "2026-11-16").sessions.every(
        (x) => x.status === "unrecorded",
      ),
    ).toBe(true);
    expect(attendance(generateDay(s, "2026-11-02").sessions).eligible).toBe(0);
  });
  it("can cancel only one subject’s practicals", () => {
    const s = scheduled();
    s.exceptions.push({
      id: "c",
      yearId: "mbbs-2",
      name: "Lab cancelled",
      start: "2026-11-02",
      end: "2026-11-02",
      type: "cancelled",
      scope: "practical",
      entityId: "subject-0",
      weekday: 0,
    });
    const day = generateDay(s, "2026-11-02");
    expect(day.sessions.filter((x) => x.status === "cancelled")).toHaveLength(
      1,
    );
    expect(
      day.sessions
        .filter((x) => x.kind === "lecture")
        .every((x) => x.status === "unrecorded"),
    ).toBe(true);
  });
  it("supports a special Sunday following Monday; closures win", () => {
    const s = scheduled();
    s.exceptions.push({
      id: "w",
      yearId: "mbbs-2",
      name: "Working Sunday",
      start: "2026-11-08",
      end: "2026-11-08",
      type: "working",
      scope: "all",
      entityId: "",
      weekday: 1,
    });
    expect(generateDay(s, "2026-11-08").sessions).toHaveLength(3);
    s.exceptions.push({
      ...s.exceptions[0],
      id: "close",
      name: "Cancelled",
      type: "holiday",
    });
    expect(
      generateDay(s, "2026-11-08").sessions.every(
        (x) => x.status === "cancelled",
      ),
    ).toBe(true);
  });
  it("editing a previous date replaces it without duplicating attendance", () => {
    let s = markAll(scheduled(), "2026-11-02", [
      "attended",
      "absent",
      "attended",
    ]);
    const old = structuredClone(s.days["2026-11-02"]);
    const day = structuredClone(old);
    day.sessions[0].status = "absent";
    s = saveDay(s, day);
    expect(attendance(recordedSessions(s))).toMatchObject({
      attended: 1,
      absent: 2,
      eligible: 3,
    });
    expect(old.sessions[0].status).toBe("attended");
  });
  it("rewinds edits and first saves while preserving other dates", () => {
    let s = markAll(scheduled(), "2026-11-02", ["attended"]);
    s = markAll(s, "2026-11-09", ["absent"]);
    const day = structuredClone(s.days["2026-11-02"]);
    day.sessions[0].status = "absent";
    s = saveDay(s, day);
    s = rewind(s, s.revisions.at(-1)!.id);
    expect(s.days["2026-11-02"].sessions[0].status).toBe("attended");
    s = rewind(s, s.revisions.find((x) => x.date === "2026-11-02")!.id);
    expect(s.days["2026-11-02"]).toBeUndefined();
    expect(s.days["2026-11-09"]).toBeDefined();
  });
  it("rejects undoing an older revision ahead of the latest for that date", () => {
    let s = markAll(scheduled(), "2026-11-02", ["attended"]);
    s = saveDay(s, s.days["2026-11-02"]);
    expect(() => rewind(s, s.revisions[0].id)).toThrow(/latest/);
  });
  it("preserves past snapshots through renamed subjects, archived schedules and a future year", () => {
    const s = markAll(scheduled(), "2026-11-02", [
      "attended",
      "absent",
      "attended",
    ]);
    const old = JSON.stringify(s.days);
    s.subjects[0].name = "Renamed";
    s.slots[0].archived = true;
    s.years.push({
      id: "mbbs-3",
      name: "Third year",
      start: "2027-11-02",
      end: "2028-11-01",
      archived: false,
    });
    s.currentYearId = "mbbs-3";
    s.subjects.push({
      id: "new-sub",
      yearId: "mbbs-3",
      name: "New subject",
      archived: false,
      lectureTarget: 75,
      practicalTarget: 80,
    });
    s.slots.push({
      ...slot("new-class"),
      yearId: "mbbs-3",
      subjectId: "new-sub",
      weekday: 2,
      from: "2027-11-02",
      to: "2028-11-01",
    });
    expect(JSON.stringify(s.days)).toBe(old);
    expect(generateDay(s, "2027-11-02").sessions[0].name).toBe("New subject");
    expect(
      attendance(recordedSessions(s, { yearId: "mbbs-3" })).percent,
    ).toBeNull();
    expect(parseState(s).days["2026-11-02"].sessions[0].name).toBe(
      "Pharmacology",
    );
  });
  it("bounds rewind history to the latest 100 saves", () => {
    let s = scheduled();
    for (let i = 0; i < 110; i++) s = saveDay(s, generateDay(s, "2026-11-02"));
    expect(s.revisions).toHaveLength(100);
  });
});
describe("Clinical postings", () => {
  function clinical() {
    const s = scheduled();
    s.departments = [
      { id: "med", name: "Medicine", target: 75, archived: false },
    ];
    s.rotations = ["r1", "r2"].map((id) => ({
      id,
      yearId: "mbbs-2",
      departmentId: "med",
      name: id,
      start: "2026-11-02",
      end: "2026-11-30",
      weekdays: [1, 2, 3],
      time: "11:00",
      target: 80,
      archived: false,
    }));
    return s;
  }
  it("tracks departments and each rotation separately, independent of lectures", () => {
    let s = clinical();
    const day = generateDay(s, "2026-11-02");
    day.sessions.forEach(
      (x) =>
        (x.status =
          x.rotationId === "r1"
            ? "attended"
            : x.rotationId === "r2"
              ? "absent"
              : "unrecorded"),
    );
    s = saveDay(s, day);
    expect(attendance(recordedSessions(s, { rotationId: "r1" })).percent).toBe(
      100,
    );
    expect(attendance(recordedSessions(s, { rotationId: "r2" })).percent).toBe(
      0,
    );
    expect(
      attendance(recordedSessions(s, { entityId: "med", kind: "clinical" }))
        .percent,
    ).toBe(50);
    expect(
      attendance(recordedSessions(s, { kind: "lecture" })).percent,
    ).toBeNull();
  });
  it("stops generation when rotations or departments are archived but keeps historical totals", () => {
    let s = clinical();
    const day = generateDay(s, "2026-11-02");
    day.sessions.forEach((x) => (x.status = "attended"));
    s = saveDay(s, day);
    s.departments[0].name = "General medicine";
    s.departments[0].archived = true;
    expect(generateDay(s, "2026-11-03").sessions).toHaveLength(0);
    expect(attendance(recordedSessions(s, { kind: "clinical" })).attended).toBe(
      2,
    );
    expect(
      s.days["2026-11-02"].sessions.find((x) => x.kind === "clinical")?.name,
    ).toBe("Medicine");
  });
  it("supports confirmed clinical cancellations and rotation date boundaries", () => {
    const s = clinical();
    s.exceptions.push({
      id: "c",
      yearId: "mbbs-2",
      name: "Ward closed",
      start: "2026-11-02",
      end: "2026-11-02",
      type: "cancelled",
      scope: "clinical",
      entityId: "med",
      weekday: 0,
    });
    expect(
      generateDay(s, "2026-11-02")
        .sessions.filter((x) => x.kind === "clinical")
        .every((x) => x.status === "cancelled"),
    ).toBe(true);
    expect(
      generateDay(s, "2026-12-01").sessions.filter(
        (x) => x.kind === "clinical",
      ),
    ).toHaveLength(0);
  });
});
describe("Exports and backup validation", () => {
  it("exports CSV with separate type and session rows and safe spreadsheet escaping", () => {
    const s = markAll(scheduled(), "2026-11-02", [
      "attended",
      "absent",
      "cancelled",
    ]);
    s.days["2026-11-02"].sessions[0].label = '=HYPERLINK("bad")';
    const csv = attendanceCSV(s);
    expect(csv.split("\r\n")).toHaveLength(4);
    expect(csv).toContain('"Lecture"');
    expect(csv).toContain('"Practical"');
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
  });
  it("safely migrates version 1 and rejects unknown versions", () => {
    const s = initialState();
    const old = {
      ...s,
      schemaVersion: 1,
      exams: undefined,
      revisions: undefined,
    };
    expect(parseState(old).schemaVersion).toBe(3);
    expect(() => parseState({ ...s, schemaVersion: 999 })).toThrow(
      /Unsupported/,
    );
  });
  it("rejects invalid dates, duplicate IDs, missing references and bad percentages", () => {
    const s = scheduled();
    expect(() =>
      parseState({ ...s, years: [{ ...s.years[0], start: "2026-02-30" }] }),
    ).toThrow();
    expect(() =>
      parseState({ ...s, subjects: [...s.subjects, s.subjects[0]] }),
    ).toThrow();
    expect(() =>
      parseState({ ...s, slots: [{ ...s.slots[0], subjectId: "missing" }] }),
    ).toThrow();
    expect(() =>
      parseState({
        ...s,
        subjects: [{ ...s.subjects[0], lectureTarget: 101 }],
      }),
    ).toThrow();
  });
});
