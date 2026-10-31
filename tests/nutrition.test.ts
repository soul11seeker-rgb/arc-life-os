import { describe, expect, it } from "vitest";
import {
  foods,
  mealEstimate,
  nutritionSummary,
  ghostBriefing,
  fruitRotation,
  expiryStatus,
} from "../src/domain/nutrition";
import { initialFuel, mealSchema } from "../src/domain/power";
import type { Food, Meal } from "../src/domain/power";
const date = "2026-11-02";
const meal = (food: Food = foods[0], patch: Partial<Meal> = {}): Meal => ({
  id: "m",
  date,
  slot: "breakfast",
  name: food.name,
  unit: food.unit,
  portion: food.portion,
  source: food.source,
  nutrients: food.nutrients,
  quantity: 1,
  ...patch,
});
describe("Honest offline nutrition estimates", () => {
  it("scales a documented 50 g egg serving and household counts", () => {
    const estimate = mealEstimate(meal(foods[0], { quantity: 2 }));
    expect(estimate.protein).toBeCloseTo(12.58);
    expect(estimate.calories).toBe(155);
    expect(estimate.b12).toBeCloseTo(1.11);
    expect(
      mealEstimate(meal(foods.find((x) => x.id === "milk")!)).calcium,
    ).toBe(226);
  });
  it("never assigns nutrition to an unknown quantity", () =>
    expect(mealEstimate(meal(foods[0], { quantity: undefined }))).toEqual({}));
  it("never assigns nutrition to unknown PG food, even with a plate count", () => {
    const m = meal(foods[0], {
      name: "Unknown PG dinner",
      quantity: 2,
      nutrients: {},
    });
    expect(mealEstimate(m)).toEqual({});
    expect(nutritionSummary([m]).protein.value).toBeNull();
  });
  it("keeps known zero, missing values and partial totals distinct", () => {
    const summary = nutritionSummary([
      meal(foods[0]),
      meal(foods[0], { id: "unknown", nutrients: {}, quantity: undefined }),
    ]);
    expect(summary.fibre).toEqual({ value: 0, known: 1, total: 2 });
    expect(summary.protein.value).toBeCloseTo(6.29);
    expect(nutritionSummary([]).protein.value).toBeNull();
  });
  it("uses serving snapshots independently of later food definition edits", () => {
    const f = structuredClone(foods[0]);
    const m = structuredClone(meal(f));
    f.nutrients.protein = 100;
    expect(mealEstimate(m).protein).toBeCloseTo(6.29);
  });
  it.each([0, -1, Infinity, NaN])("rejects invalid quantities %s", (quantity) =>
    expect(() => mealSchema.parse(meal(foods[0], { quantity }))).toThrow(),
  );
  it("rejects negative nutrient data and invalid dates", () => {
    expect(() =>
      mealSchema.parse(meal(foods[0], { nutrients: { protein: -1 } })),
    ).toThrow();
    expect(() =>
      mealSchema.parse(meal(foods[0], { date: "2026-02-30" })),
    ).toThrow();
  });
});
describe("GHOST conservative rules", () => {
  it("shows insufficient data for empty or partial days, without prescribing foods", () => {
    const f = initialFuel();
    expect(
      ghostBriefing(f, date).gaps.every(
        (x) => x.status === "insufficient data",
      ),
    ).toBe(true);
    f.meals = [meal()];
    expect(
      ghostBriefing(f, date).gaps.every(
        (x) => x.status === "insufficient data",
      ),
    ).toBe(true);
    expect(ghostBriefing(f, date).options).toHaveLength(0);
  });
  it("does not infer a gap from a complete day with unknown quantities", () => {
    const f = initialFuel();
    f.completeDays = [date];
    f.meals = [meal(foods[0], { quantity: undefined })];
    expect(
      ghostBriefing(f, date).gaps.every(
        (x) => x.status === "insufficient data",
      ),
    ).toBe(true);
  });
  it("assesses completeness independently for each nutrient", () => {
    const f = initialFuel();
    f.completeDays = [date];
    f.meals = [meal(foods[0], { nutrients: { protein: 12 } })];
    const b = ghostBriefing(f, date);
    expect(b.gaps.find((x) => x.key === "protein")!.status).toBe(
      "estimated gap",
    );
    expect(b.gaps.find((x) => x.key === "calcium")!.status).toBe(
      "insufficient data",
    );
  });
  it("compares a complete known day with editable protein goals", () => {
    const f = initialFuel();
    f.completeDays = [date];
    f.meals = [meal()];
    f.preferences.proteinTarget = 10;
    expect(
      ghostBriefing(f, date).gaps.find((x) => x.key === "protein")!.status,
    ).toBe("estimated gap");
    f.meals[0].quantity = 2;
    expect(
      ghostBriefing(f, date).gaps.find((x) => x.key === "protein")!.status,
    ).toBe("estimate meets reference");
  });
  it("filters recommendations by vegan preference, exclusions, fridge and budget", () => {
    const f = initialFuel();
    f.completeDays = [date];
    f.meals = [meal()];
    f.preferences = {
      ...f.preferences,
      diet: "vegan",
      fridge: false,
      weeklyBudget: 20,
      maxItemCost: 20,
      excludedFoods: ["peanuts"],
    };
    const b = ghostBriefing(f, date);
    expect(b.options.map((x) => x.id)).toEqual(["guava"]);
    expect(
      b.options.every(
        (x) =>
          x.cost <= 20 &&
          !x.fridge &&
          x.diet.includes("vegan") &&
          x.why.length > 10,
      ),
    ).toBe(true);
    f.shopping = [{ id: "s", name: "Purchased food", checked: true, cost: 20 }];
    expect(ghostBriefing(f, date).options).toHaveLength(0);
  });
  it("enables small chilled servings only with reliable fridge access", () => {
    const f = initialFuel();
    f.completeDays = [date];
    f.meals = [meal()];
    expect(ghostBriefing(f, date).options.some((x) => x.id === "curd")).toBe(
      false,
    );
    f.preferences.fridge = true;
    expect(ghostBriefing(f, date).options.some((x) => x.id === "curd")).toBe(
      true,
    );
  });
  it("does not let other dates create gaps or suggestions", () => {
    const f = initialFuel();
    f.completeDays = [date];
    f.meals = [meal()];
    expect(
      ghostBriefing(f, "2026-11-03").gaps.every(
        (x) => x.status === "insufficient data",
      ),
    ).toBe(true);
  });
  it("does not claim affordability when purchased item prices are unknown", () => {
    const f = initialFuel();
    f.completeDays = [date];
    f.meals = [meal()];
    f.shopping = [{ id: "s", name: "Unknown cost", checked: true }];
    expect(ghostBriefing(f, date).options).toHaveLength(0);
  });
});
describe("Small-storage planning", () => {
  it("creates a reproducible seasonal rotation for the same Monday-start week", () => {
    expect(fruitRotation(date)).toEqual(fruitRotation("2026-11-08"));
    expect(fruitRotation(date)).toHaveLength(7);
    expect(fruitRotation(date).some((x) => x.fruit === "Guava")).toBe(true);
    expect(fruitRotation("2027-05-01").some((x) => x.fruit === "Mango")).toBe(
      true,
    );
  });
  it("uses entered expiry dates without inventing safe shelf lives", () => {
    expect(expiryStatus(undefined, date)).toBe("No expiry set");
    expect(expiryStatus("2026-11-01", date)).toBe("Past entered expiry");
    expect(expiryStatus(date, date)).toBe("Use-by date today");
    expect(expiryStatus("2026-11-04", date)).toBe("Use-by in 2 days");
  });
});
