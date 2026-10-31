import { describe, expect, it } from "vitest";
import {
  initialTraining,
  trainingEntrySchema,
  trainingStats,
  weeklyWeights,
  weekStart,
  wellnessSchema,
} from "../src/domain/power";
import type { TrainingEntry } from "../src/domain/power";
const entry = (
  id: string,
  date: string,
  kind: TrainingEntry["kind"] = "gym",
  completed = true,
): TrainingEntry => ({ id, date, kind, completed, note: "", exercises: [] });
describe("Beginner Training", () => {
  it("starts with a once-weekly sports goal and no fake progress", () => {
    const t = initialTraining();
    expect(t.goals.sportsWeekly).toBe(1);
    expect(trainingStats(t, "2026-11-02")).toMatchObject({
      gym: 0,
      sports: 0,
      sessions: 0,
      minutes: 0,
    });
  });
  it("counts completed distinct days for goals, including running and football", () => {
    const t = initialTraining();
    t.entries = [
      entry("a", "2026-11-02"),
      entry("b", "2026-11-02"),
      entry("c", "2026-11-03", "gym", false),
      entry("d", "2026-11-04", "football"),
      entry("e", "2026-11-04", "running"),
    ];
    expect(trainingStats(t, "2026-11-08")).toMatchObject({
      gym: 1,
      sports: 1,
      sessions: 4,
      activeDays: 2,
    });
  });
  it("keeps rest days separate and excludes unfinished workouts", () => {
    const t = initialTraining();
    t.entries = [
      entry("a", "2026-11-02", "rest"),
      entry("b", "2026-11-03", "running", false),
    ];
    expect(trainingStats(t, "2026-11-02")).toMatchObject({
      restDays: 1,
      activeDays: 0,
      sessions: 0,
      sports: 0,
    });
  });
  it("uses Monday weeks across month and year boundaries", () => {
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
    const t = initialTraining();
    t.entries = [
      entry("a", "2026-12-28"),
      entry("b", "2027-01-03"),
      entry("c", "2027-01-04"),
    ];
    expect(trainingStats(t, "2027-01-01")).toMatchObject({
      gym: 2,
      sessions: 2,
      activeDays: 2,
    });
  });
  it("totals only recorded duration and running distance within the month", () => {
    const t = initialTraining();
    t.entries = [
      { ...entry("a", "2026-11-02", "running"), minutes: 20, distanceKm: 2.5 },
      { ...entry("b", "2026-11-03", "football"), minutes: 45 },
      { ...entry("c", "2026-10-31", "running"), minutes: 10, distanceKm: 1 },
    ];
    expect(trainingStats(t, "2026-11-02")).toMatchObject({
      minutes: 65,
      distanceKm: 2.5,
      sessions: 2,
    });
  });
  it("supports optional exercise checkboxes, sets, reps and zero external weight", () => {
    expect(
      trainingEntrySchema.parse({
        ...entry("a", "2026-11-02"),
        exercises: [
          {
            name: "Bodyweight squat",
            done: true,
            sets: 2,
            reps: 8,
            weightKg: 0,
          },
        ],
      }).exercises[0].weightKg,
    ).toBe(0);
    expect(() =>
      trainingEntrySchema.parse({ ...entry("a", "2026-11-02"), minutes: -1 }),
    ).toThrow();
  });
  it("averages actual weights by week, keeps missing weeks blank and excludes future weeks", () => {
    const p = weeklyWeights(
      [
        { date: "2026-11-02", weightKg: 70 },
        { date: "2026-11-04", weightKg: 72 },
        { date: "2026-11-09", weightKg: 99 },
        { date: "2026-10-27", energy: 3 },
      ],
      "2026-11-08",
    );
    expect(p).toHaveLength(8);
    expect(p.at(-1)).toEqual({ week: "2026-11-02", value: 71, count: 2 });
    expect(p.at(-2)!.value).toBeNull();
  });
  it("validates optional wellness rather than converting blank values to zero", () => {
    expect(wellnessSchema.parse({ date: "2026-11-02" })).toEqual({
      date: "2026-11-02",
    });
    expect(() =>
      wellnessSchema.parse({ date: "2026-11-02", weightKg: 0 }),
    ).toThrow();
    expect(() =>
      wellnessSchema.parse({ date: "2026-11-02", sleepHours: 25 }),
    ).toThrow();
    expect(() =>
      wellnessSchema.parse({ date: "2026-11-02", energy: 6 }),
    ).toThrow();
  });
});
