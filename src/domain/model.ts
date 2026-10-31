import { z } from "zod";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Use a valid date",
  );
const id = z.string().min(1).max(120);
const name = z.string().trim().min(1).max(160);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const target = z.number().min(1).max(100);
export const kinds = ["lecture", "practical", "clinical"] as const;
export const statuses = [
  "unrecorded",
  "attended",
  "absent",
  "cancelled",
] as const;
export const kindSchema = z.enum(kinds);
export const statusSchema = z.enum(statuses);
export const yearSchema = z
  .object({
    id,
    name,
    start: dateSchema,
    end: dateSchema,
    archived: z.boolean(),
  })
  .refine((x) => x.end >= x.start, "End must follow start");
export const subjectSchema = z.object({
  id,
  yearId: id,
  name,
  archived: z.boolean(),
  lectureTarget: target,
  practicalTarget: target,
});
export const departmentSchema = z.object({
  id,
  name,
  archived: z.boolean(),
  target,
});
const weekdays = z.array(z.number().int().min(0).max(6)).min(1).max(7);
export const slotSchema = z
  .object({
    id,
    yearId: id,
    subjectId: id,
    kind: z.enum(["lecture", "practical"]),
    weekday: z.number().int().min(0).max(6),
    time,
    label: z.string().max(160),
    from: dateSchema,
    to: dateSchema,
    archived: z.boolean(),
  })
  .refine((x) => x.to >= x.from, "End must follow start");
export const rotationSchema = z
  .object({
    id,
    yearId: id,
    departmentId: id,
    name,
    start: dateSchema,
    end: dateSchema,
    weekdays,
    time,
    archived: z.boolean(),
    target,
  })
  .refine((x) => x.end >= x.start, "End must follow start");
export const exceptionSchema = z
  .object({
    id,
    yearId: id,
    name,
    start: dateSchema,
    end: dateSchema,
    type: z.enum(["holiday", "cancelled", "working"]),
    scope: z.enum(["all", ...kinds]),
    entityId: z.string().max(120),
    weekday: z.number().int().min(0).max(6),
  })
  .refine((x) => x.end >= x.start, "End must follow start");
export const sessionSchema = z.object({
  id,
  yearId: id,
  entityId: id,
  rotationId: z.string().max(120),
  rotationName: z.string().max(160).default(""),
  name,
  kind: kindSchema,
  time,
  label: z.string().max(160),
  status: statusSchema,
  source: z.enum(["timetable", "rotation", "manual"]),
  reason: z.string().max(160),
});
export const daySchema = z.object({
  date: dateSchema,
  sessions: z.array(sessionSchema).max(500),
  habits: z.object({
    study: z.boolean(),
    gym: z.boolean(),
    sport: z.boolean(),
  }),
  note: z.string().max(3000),
  savedAt: z.string().datetime(),
});
export const revisionSchema = z.object({
  id,
  date: dateSchema,
  at: z.string().datetime(),
  previous: daySchema.nullable(),
});
export const examSchema = z.object({ id, yearId: id, name, date: dateSchema });
export const stateSchema = z
  .object({
    schemaVersion: z.literal(2),
    currentYearId: id,
    years: z.array(yearSchema).min(1),
    subjects: z.array(subjectSchema),
    departments: z.array(departmentSchema),
    rotations: z.array(rotationSchema),
    slots: z.array(slotSchema),
    exceptions: z.array(exceptionSchema),
    exams: z.array(examSchema),
    days: z.record(dateSchema, daySchema),
    revisions: z.array(revisionSchema).max(100),
    settings: z.object({ warningMargin: z.number().min(0).max(30) }),
  })
  .superRefine((s, ctx) => {
    const err = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    for (const list of [
      s.years,
      s.subjects,
      s.departments,
      s.rotations,
      s.slots,
      s.exceptions,
      s.exams,
      s.revisions,
    ])
      if (new Set(list.map((x) => x.id)).size !== list.length)
        err("Duplicate IDs in backup");
    const years = new Set(s.years.map((x) => x.id));
    const subjects = new Map(s.subjects.map((x) => [x.id, x]));
    const deps = new Set(s.departments.map((x) => x.id));
    const rotations = new Map(s.rotations.map((x) => [x.id, x]));
    if (!years.has(s.currentYearId)) err("Unknown active academic year");
    for (const x of [
      ...s.subjects,
      ...s.slots,
      ...s.rotations,
      ...s.exceptions,
      ...s.exams,
    ])
      if (!years.has(x.yearId)) err("Unknown academic year");
    for (const x of s.slots)
      if (subjects.get(x.subjectId)?.yearId !== x.yearId)
        err("Timetable subject belongs to another year");
    for (const x of s.rotations)
      if (!deps.has(x.departmentId)) err("Unknown clinical department");
    for (const x of s.exceptions)
      if (
        x.entityId &&
        !(x.scope === "clinical"
          ? deps.has(x.entityId)
          : subjects.get(x.entityId)?.yearId === x.yearId)
      )
        err("Unknown holiday/cancellation subject");
    const checkDay = (day: Day) => {
      if (new Set(day.sessions.map((x) => x.id)).size !== day.sessions.length)
        err("Duplicate session IDs");
      for (const x of day.sessions) {
        if (!years.has(x.yearId)) err("Unknown session academic year");
        if (x.kind === "clinical") {
          if (!deps.has(x.entityId)) err("Unknown session department");
          if (
            x.rotationId &&
            (rotations.get(x.rotationId)?.departmentId !== x.entityId ||
              rotations.get(x.rotationId)?.yearId !== x.yearId)
          )
            err("Unknown session rotation");
        } else if (
          subjects.get(x.entityId)?.yearId !== x.yearId ||
          x.rotationId
        )
          err("Unknown session subject");
      }
    };
    for (const [key, day] of Object.entries(s.days)) {
      if (key !== day.date) err("Day key and date differ");
      checkDay(day);
    }
    for (const rev of s.revisions) {
      if (rev.previous) {
        if (rev.previous.date !== rev.date) err("Rewind date mismatch");
        checkDay(rev.previous);
      }
    }
  });
export type Kind = z.infer<typeof kindSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Year = z.infer<typeof yearSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Department = z.infer<typeof departmentSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type Rotation = z.infer<typeof rotationSchema>;
export type Exception = z.infer<typeof exceptionSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Day = z.infer<typeof daySchema>;
export type State = z.infer<typeof stateSchema>;
export const uid = () => crypto.randomUUID();
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const weekday = (date: string) =>
  new Date(`${date}T12:00:00Z`).getUTCDay();
export const shiftDate = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export function initialState(): State {
  return {
    schemaVersion: 2,
    currentYearId: "mbbs-2",
    years: [
      {
        id: "mbbs-2",
        name: "MBBS · Second year",
        start: "2026-11-02",
        end: "2027-11-01",
        archived: false,
      },
    ],
    subjects: ["Pharmacology", "Microbiology", "Pathology"].map((name, i) => ({
      id: `subject-${i}`,
      yearId: "mbbs-2",
      name,
      archived: false,
      lectureTarget: 75,
      practicalTarget: 80,
    })),
    departments: [],
    rotations: [],
    slots: [],
    exceptions: [],
    exams: [],
    days: {},
    revisions: [],
    settings: { warningMargin: 5 },
  };
}
export function parseState(input: unknown): State {
  if (typeof input !== "object" || !input)
    throw new Error("This is not an ARC backup.");
  const value = input as Record<string, unknown>;
  if (value.schemaVersion === 1)
    return stateSchema.parse({
      ...value,
      schemaVersion: 2,
      exams: value.exams ?? [],
      revisions: value.revisions ?? [],
    });
  if (value.schemaVersion !== 2)
    throw new Error(
      "Unsupported backup version. Keep this file and update ARC before restoring it.",
    );
  return stateSchema.parse(value);
}
