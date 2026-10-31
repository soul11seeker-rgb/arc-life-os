import type { Food, Fuel, Meal, Nutrient, Nutrients } from "./power";
import { nutrientKeys, weekStart } from "./power";
export const nutrientLabels: Record<Nutrient, string> = {
  protein: "Protein",
  calories: "Calories",
  fibre: "Fibre",
  calcium: "Calcium",
  iron: "Iron",
  vitaminC: "Vitamin C",
  b12: "Vitamin B12",
};
export const nutrientUnits: Record<Nutrient, string> = {
  protein: "g",
  calories: "kcal",
  fibre: "g",
  calcium: "mg",
  iron: "mg",
  vitaminC: "mg",
  b12: "µg",
};
const source =
  "USDA FoodData Central · SR Legacy; see docs/NUTRITION_SOURCES.md";
// Explicit household serving assumptions; nutrients are scaled from documented per-100 g food composition.
function food(
  id: string,
  name: string,
  unit: string,
  portion: string,
  grams: number,
  per100: number[],
): Food {
  return {
    id,
    name,
    unit,
    portion,
    favourite: false,
    source,
    nutrients: Object.fromEntries(
      nutrientKeys.map((k, i) => [k, (per100[i] * grams) / 100]),
    ),
  };
}
export const foods: Food[] = [
  food(
    "egg",
    "Boiled egg",
    "egg",
    "1 large egg · 50 g edible",
    50,
    [12.58, 155, 0, 50, 1.19, 0, 1.11],
  ),
  food(
    "milk",
    "Whole milk",
    "glass",
    "1 glass · about 200 g / 200 ml",
    200,
    [3.15, 61, 0, 113, 0.03, 0, 0.45],
  ),
  food(
    "curd",
    "Plain whole-milk curd / yogurt",
    "bowl",
    "1 small bowl · 100 g",
    100,
    [3.47, 61, 0, 121, 0.05, 0.5, 0.37],
  ),
  food(
    "dal",
    "Cooked lentils (plain dal base)",
    "bowl",
    "1 bowl · 150 g cooked lentils, no added oil/water",
    150,
    [9.02, 116, 7.9, 19, 3.33, 1.5, 0],
  ),
  food(
    "chana",
    "Cooked chickpeas / chana",
    "bowl",
    "1 bowl · 150 g cooked, drained",
    150,
    [8.86, 164, 7.6, 49, 2.89, 1.3, 0],
  ),
  food(
    "peanuts",
    "Raw peanuts",
    "handful",
    "1 small handful · 30 g shelled",
    30,
    [25.8, 567, 8.5, 92, 4.58, 0, 0],
  ),
  food(
    "banana",
    "Banana",
    "banana",
    "1 medium banana · 118 g edible",
    118,
    [1.09, 89, 2.6, 5, 0.26, 8.7, 0],
  ),
  food(
    "guava",
    "Guava",
    "guava",
    "1 weighed serving · 100 g edible",
    100,
    [2.55, 68, 5.4, 18, 0.26, 228.3, 0],
  ),
  food(
    "orange",
    "Orange",
    "orange",
    "1 medium orange · 131 g edible",
    131,
    [0.94, 47, 2.4, 40, 0.1, 53.2, 0],
  ),
  food(
    "rice",
    "Plain cooked white rice",
    "bowl",
    "1 bowl · 150 g cooked, no added oil",
    150,
    [2.69, 130, 0.4, 10, 0.2, 0, 0],
  ),
  food(
    "oats",
    "Plain dry oats",
    "packet",
    "1 measured packet · 40 g dry, unfortified",
    40,
    [16.89, 389, 10.6, 54, 4.72, 0, 0],
  ),
];
export function mealEstimate(
  meal: Pick<Meal, "quantity" | "nutrients">,
): Nutrients {
  if (meal.quantity === undefined) return {};
  return Object.fromEntries(
    nutrientKeys
      .filter((k) => meal.nutrients[k] !== undefined)
      .map((k) => [k, meal.nutrients[k]! * meal.quantity!]),
  );
}
export function nutritionSummary(meals: Meal[]) {
  return Object.fromEntries(
    nutrientKeys.map((key) => {
      const estimates = meals.map(mealEstimate);
      const known = estimates.filter((x) => x[key] !== undefined);
      return [
        key,
        {
          value: known.length ? known.reduce((n, x) => n + x[key]!, 0) : null,
          known: known.length,
          total: meals.length,
        },
      ];
    }),
  ) as Record<Nutrient, { value: number | null; known: number; total: number }>;
}
// General adult reference markers, not personalized prescriptions. Iron varies substantially by age/sex.
export const referenceTargets = {
  fibre: 25,
  calcium: 1000,
  iron: 8,
  vitaminC: 75,
  b12: 2.4,
};
type Suggestion = {
  id: string;
  name: string;
  why: string;
  cost: number;
  diet: string[];
  fridge: boolean;
  nutrients: Nutrient[];
  storage: string;
};
const suggestions: Suggestion[] = [
  {
    id: "chana",
    name: "Cooked chana",
    why: "Adds plant protein, fibre and iron; pair with guava or lemon for vitamin C.",
    cost: 25,
    diet: ["vegan", "vegetarian", "eggetarian", "omnivore"],
    fridge: false,
    nutrients: ["protein", "fibre", "iron"],
    storage:
      "Buy a ready-cooked single serving and eat promptly; a kettle is not a pressure cooker.",
  },
  {
    id: "peanuts",
    name: "Plain peanuts",
    why: "A small measured handful adds protein, fibre and iron without taking fridge space.",
    cost: 15,
    diet: ["vegan", "vegetarian", "eggetarian", "omnivore"],
    fridge: false,
    nutrients: ["protein", "fibre", "iron"],
    storage: "Keep sealed and dry; exclude if allergic.",
  },
  {
    id: "milk",
    name: "Single-serve milk",
    why: "Adds calcium, protein and vitamin B12.",
    cost: 20,
    diet: ["vegetarian", "eggetarian", "omnivore"],
    fridge: false,
    nutrients: ["protein", "calcium", "b12"],
    storage:
      "Choose unopened shelf-stable UHT milk; finish on opening if no reliable fridge.",
  },
  {
    id: "curd",
    name: "Plain curd",
    why: "Adds calcium, protein and vitamin B12.",
    cost: 20,
    diet: ["vegetarian", "eggetarian", "omnivore"],
    fridge: true,
    nutrients: ["protein", "calcium", "b12"],
    storage:
      "Buy a small chilled serving; keep refrigerated and follow its use-by label.",
  },
  {
    id: "egg",
    name: "Freshly cooked eggs",
    why: "Add protein and vitamin B12 with very little preparation.",
    cost: 16,
    diet: ["eggetarian", "omnivore"],
    fridge: false,
    nutrients: ["protein", "b12"],
    storage:
      "Buy freshly cooked; eat promptly. Use an appliance only as its manufacturer permits.",
  },
  {
    id: "guava",
    name: "Guava",
    why: "Adds vitamin C and fibre; vitamin C helps absorption of plant iron.",
    cost: 20,
    diet: ["vegan", "vegetarian", "eggetarian", "omnivore"],
    fridge: false,
    nutrients: ["vitaminC", "fibre"],
    storage:
      "Buy one or two whole fruits; wash before eating and eat cut fruit promptly.",
  },
];
export function ghostBriefing(fuel: Fuel, date: string) {
  const meals = fuel.meals.filter((x) => x.date === date);
  const summary = nutritionSummary(meals);
  const targets = {
    protein: fuel.preferences.proteinTarget,
    ...referenceTargets,
  };
  const complete = fuel.completeDays.includes(date);
  const gaps = (Object.keys(targets) as (keyof typeof targets)[]).map((key) => {
    const result = summary[key];
    const status =
      !complete || result.total === 0 || result.known !== result.total
        ? "insufficient data"
        : result.value! < targets[key]
          ? "estimated gap"
          : "estimate meets reference";
    return { key, status, ...result, target: targets[key] };
  });
  const missing = gaps
    .filter((x) => x.status === "estimated gap")
    .map((x) => x.key);
  const spent = fuel.shopping
    .filter((x) => x.checked)
    .reduce((n, x) => n + (x.cost ?? 0), 0);
  const remaining = Math.max(0, fuel.preferences.weeklyBudget - spent);
  const budgetKnown = !fuel.shopping.some(
    (x) => x.checked && x.cost === undefined,
  );
  const options = suggestions
    .filter(
      (x) =>
        budgetKnown &&
        x.diet.includes(fuel.preferences.diet) &&
        (!x.fridge || fuel.preferences.fridge) &&
        x.cost <= Math.min(remaining, fuel.preferences.maxItemCost) &&
        !fuel.preferences.excludedFoods.some((t) =>
          `${x.id} ${x.name}`.toLowerCase().includes(t.toLowerCase()),
        ) &&
        x.nutrients.some((n) =>
          missing.includes(n as (typeof missing)[number]),
        ),
    )
    .sort((a, b) => a.cost - b.cost);
  return { gaps, options, remaining, complete, budgetKnown };
}
export function fruitRotation(date: string) {
  const month = Number(date.slice(5, 7));
  // Typical Telangana market seasons, not a promise of local price or availability.
  const seasonal =
    month >= 3 && month <= 6
      ? ["Mango", "Watermelon", "Banana"]
      : month >= 7 && month <= 9
        ? ["Guava", "Papaya", "Banana"]
        : ["Guava", "Orange / mosambi", "Banana"];
  const week = Math.floor(
    Date.parse(`${weekStart(date)}T12:00:00Z`) / 604800000,
  );
  return Array.from({ length: 7 }, (_, i) => ({
    day: i,
    fruit:
      seasonal[
        (((week + i) % seasonal.length) + seasonal.length) % seasonal.length
      ],
  }));
}
export function expiryStatus(expires: string | undefined, today: string) {
  if (!expires) return "No expiry set";
  const days = Math.round(
    (Date.parse(`${expires}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) /
      86400000,
  );
  return days < 0
    ? "Past entered expiry"
    : days === 0
      ? "Use-by date today"
      : days <= 2
        ? `Use-by in ${days} day${days === 1 ? "" : "s"}`
        : `Use-by ${expires}`;
}
