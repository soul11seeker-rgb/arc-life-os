import { z } from "zod";
import { dateSchema, recordId as id, recordName as name } from "./validation";
const optionalNumber = (max: number) =>
  z.number().finite().min(0).max(max).optional();
export const nutrientKeys = [
  "protein",
  "calories",
  "fibre",
  "calcium",
  "iron",
  "vitaminC",
  "b12",
] as const;
export const nutrientsSchema = z
  .object({
    protein: optionalNumber(10000),
    calories: optionalNumber(100000),
    fibre: optionalNumber(10000),
    calcium: optionalNumber(100000),
    iron: optionalNumber(10000),
    vitaminC: optionalNumber(100000),
    b12: optionalNumber(10000),
  })
  .strict();
export type Nutrients = z.infer<typeof nutrientsSchema>;
export type Nutrient = (typeof nutrientKeys)[number];
export const activityKinds = ["gym", "football", "running", "rest"] as const;
export const trainingEntrySchema = z.object({
  id,
  date: dateSchema,
  kind: z.enum(activityKinds),
  completed: z.boolean(),
  minutes: optionalNumber(1440),
  distanceKm: optionalNumber(1000),
  note: z.string().max(1000),
  exercises: z
    .array(
      z.object({
        name,
        done: z.boolean(),
        sets: z.number().int().min(1).max(100).optional(),
        reps: z.number().int().min(1).max(1000).optional(),
        weightKg: optionalNumber(1000),
      }),
    )
    .max(100),
});
export const wellnessSchema = z.object({
  date: dateSchema,
  weightKg: z.number().finite().min(20).max(500).optional(),
  sleepHours: optionalNumber(24),
  energy: z.number().int().min(1).max(5).optional(),
  digestion: z.enum(["comfortable", "mixed", "uncomfortable"]).optional(),
});
export const trainingSchema = z.object({
  entries: z.array(trainingEntrySchema),
  goals: z.object({
    gymWeekly: z.number().int().min(0).max(14),
    sportsWeekly: z.number().int().min(0).max(14),
  }),
  wellness: z.array(wellnessSchema),
});
export const foodSchema = z.object({
  id,
  name,
  unit: name,
  portion: name,
  nutrients: nutrientsSchema,
  source: z.string().max(500),
  favourite: z.boolean(),
});
export const mealSlots = ["breakfast", "lunch", "dinner", "snack"] as const;
export const mealSchema = z.object({
  id,
  date: dateSchema,
  slot: z.enum(mealSlots),
  name,
  quantity: z.number().finite().positive().max(10000).optional(),
  unit: name,
  portion: name,
  nutrients: nutrientsSchema,
  source: z.string().max(500),
});
export const pantrySchema = z.object({
  id,
  name,
  quantity: name,
  storage: z.enum(["shelf", "fridge"]),
  expires: dateSchema.optional(),
});
export const shoppingSchema = z.object({
  id,
  name,
  checked: z.boolean(),
  cost: optionalNumber(100000),
});
export const fuelSchema = z.object({
  meals: z.array(mealSchema),
  foods: z.array(foodSchema),
  pantry: z.array(pantrySchema),
  shopping: z.array(shoppingSchema),
  completeDays: z.array(dateSchema),
  preferences: z.object({
    proteinTarget: z.number().finite().min(10).max(300),
    weeklyBudget: z.number().finite().min(0).max(100000),
    maxItemCost: z.number().finite().min(0).max(10000),
    diet: z.enum(["vegetarian", "eggetarian", "omnivore", "vegan"]),
    fridge: z.boolean(),
    excludedFoods: z.array(name).max(100),
  }),
});
export type TrainingEntry = z.infer<typeof trainingEntrySchema>;
export type Wellness = z.infer<typeof wellnessSchema>;
export type Training = z.infer<typeof trainingSchema>;
export type Food = z.infer<typeof foodSchema>;
export type Meal = z.infer<typeof mealSchema>;
export type Fuel = z.infer<typeof fuelSchema>;
export const initialTraining = (): Training => ({
  entries: [],
  goals: { gymWeekly: 3, sportsWeekly: 1 },
  wellness: [],
});
export const initialFuel = (): Fuel => ({
  meals: [],
  foods: [],
  pantry: [],
  shopping: [],
  completeDays: [],
  preferences: {
    proteinTarget: 60,
    weeklyBudget: 500,
    maxItemCost: 50,
    diet: "eggetarian",
    fridge: false,
    excludedFoods: [],
  },
});
// Monday-start weeks; ISO date arithmetic stays independent of device timezone.
export function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function trainingStats(training: Training, date: string) {
  const start = weekStart(date);
  const end = new Date(`${start}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const until = end.toISOString().slice(0, 10);
  const completed = training.entries.filter((x) => x.completed);
  const week = completed.filter((x) => x.date >= start && x.date < until);
  const month = completed.filter((x) => x.date.startsWith(date.slice(0, 7)));
  // Goals count distinct days, so duplicate sessions cannot inflate a weekly goal.
  const days = (entries: TrainingEntry[]) =>
    new Set(entries.map((x) => x.date)).size;
  return {
    gym: days(week.filter((x) => x.kind === "gym")),
    sports: days(
      week.filter((x) => x.kind === "football" || x.kind === "running"),
    ),
    activeDays: days(month.filter((x) => x.kind !== "rest")),
    restDays: days(month.filter((x) => x.kind === "rest")),
    sessions: month.filter((x) => x.kind !== "rest").length,
    minutes: month
      .filter((x) => x.kind !== "rest")
      .reduce((n, x) => n + (x.minutes ?? 0), 0),
    distanceKm: month
      .filter((x) => x.kind === "running")
      .reduce((n, x) => n + (x.distanceKm ?? 0), 0),
  };
}
export function weeklyWeights(records: Wellness[], date: string) {
  const start = weekStart(date);
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (7 - i) * 7);
    const week = d.toISOString().slice(0, 10);
    const weights = records
      .filter((x) => weekStart(x.date) === week && x.weightKg !== undefined)
      .map((x) => x.weightKg!);
    return {
      week,
      value: weights.length
        ? weights.reduce((a, b) => a + b, 0) / weights.length
        : null,
      count: weights.length,
    };
  });
}
