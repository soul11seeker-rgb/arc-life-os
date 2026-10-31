import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { initialState, today } from "../src/domain/model";
import { generateDay, saveDay } from "../src/domain/attendance";
async function navigate(page: import("@playwright/test").Page, name: string) {
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await nav.getByRole("button", { name, exact: true }).click();
}
async function ready(page: import("@playwright/test").Page) {
  await page.goto("./");
  await expect(page.getByText("Offline ready", { exact: true })).toBeVisible();
}
async function noOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("offline Training, Fuel, complete JSON backup and restore preserve Academy", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  // Create synthetic Academy history through the existing UI.
  await page
    .getByLabel("A note for your future self")
    .fill("Synthetic Academy sentinel");
  await page.getByRole("button", { name: "SAVE DAY" }).click();
  await expect(page.getByText("Day saved on this device")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await navigate(page, "Training");
  await page.getByRole("button", { name: /Gym Save a quick log/ }).click();
  await expect(page.getByText("Gym saved on this device")).toBeVisible();
  await page.getByLabel("Body weight (kg)").fill("70.5");
  await page.getByLabel("Sleep (hours, optional)").fill("7");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByText("Check-in saved on this device")).toBeVisible();
  await navigate(page, "Fuel");
  await page.getByRole("button", { name: "Log breakfast" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Food or favourite PG meal").selectOption("egg");
  await dialog
    .getByRole("checkbox", {
      name: "I know the quantity and it matches this serving",
    })
    .check();
  await dialog.getByLabel("Number of units").fill("2");
  await dialog.getByRole("button", { name: "Save meal item" }).click();
  await expect(page.getByText("Meal saved on this device")).toBeVisible();
  await page.getByRole("button", { name: "Log lunch" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Food / PG meal name").fill("Synthetic PG lunch");
  await dialog.getByRole("button", { name: "Save meal item" }).click();
  await expect(page.getByText("Nutrition not estimated")).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "I have logged all food and drinks for this day",
    })
    .click();
  await expect(page.getByText("Food-log completeness saved")).toBeVisible();
  await expect(
    page.getByText("insufficient data", { exact: true }),
  ).toHaveCount(6);
  await page.reload();
  await navigate(page, "Fuel");
  await expect(
    page.getByText("Synthetic PG lunch", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".power-metric").first()).toContainText("12.6");
  await page.getByText("How GHOST reasons & reference sources").click();
  await page.getByText("Full offline sources, portions & limitations").click();
  await expect(page.locator(".nutrition-sources")).toContainText(
    "USDA FoodData Central",
  );
  await navigate(page, "Settings");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON backup" }).click();
  const download = await downloadEvent;
  const path = await download.path();
  const json = await readFile(path!, "utf8");
  const state = JSON.parse(json);
  expect(state.schemaVersion).toBe(3);
  expect(state.training.entries).toHaveLength(1);
  expect(state.training.wellness[0].weightKg).toBe(70.5);
  expect(state.fuel.meals).toHaveLength(2);
  expect(state.days[today()].note).toBe("Synthetic Academy sentinel");
  await page.getByLabel("Import backup file").setInputFiles({
    name: "synthetic-power-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(json),
  });
  await expect(page.getByRole("dialog")).toContainText("1 Training logs");
  await page
    .getByRole("button", { name: "Download current & restore" })
    .click();
  await expect(page.getByText("Backup restored successfully")).toBeVisible();
  await navigate(page, "Today");
  await expect(page.getByLabel("A note for your future self")).toHaveValue(
    "Synthetic Academy sentinel",
  );
  await navigate(page, "Training");
  await expect(
    page.getByRole("checkbox", { name: `Completed Gym ${today()}` }),
  ).toBeChecked();
  expect(errors).toEqual([]);
});
test("phone dashboards, detailed workout, favourites, budget and pantry stay usable", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await ready(page);
  await navigate(page, "Training");
  await noOverflow(page);
  await page.screenshot({
    path: "work/screenshots/training-iphone.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.screenshot({
    path: "work/screenshots/training-phone-top.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Add details", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Minutes (optional)").fill("25");
  await dialog.getByText("Optional exercises (0)").click();
  await dialog.getByLabel("Exercise name").fill("Bodyweight squat");
  await dialog.getByLabel("Sets", { exact: true }).fill("2");
  await dialog.getByLabel("Repetitions").fill("8");
  await dialog.getByRole("button", { name: "Add exercise to session" }).click();
  await noOverflow(page);
  await dialog.getByRole("button", { name: "Save Training log" }).click();
  await expect(
    page.getByText("Training log saved on this device"),
  ).toBeVisible();
  await navigate(page, "Fuel");
  await noOverflow(page);
  await page.screenshot({
    path: "work/screenshots/fuel-iphone.png",
    fullPage: true,
    animations: "disabled",
  });
  const dismiss = page.getByRole("button", { name: "Dismiss notification" });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.screenshot({
    path: "work/screenshots/fuel-phone-top.png",
    animations: "disabled",
  });
  await context.setOffline(true);
  await page.getByRole("button", { name: "New food / PG meal" }).click();
  await page.getByLabel("Custom food name").fill("Synthetic PG favourite");
  await page.getByLabel("Portion description").fill("One unknown plate");
  await page.getByRole("button", { name: "Save custom food" }).click();
  await expect(
    page.getByText("Custom food saved; previous meals unchanged"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fuel preferences" }).click();
  await page.getByLabel("Weekly grocery budget (₹)").fill("250");
  await page.getByLabel("Dietary preference").selectOption("vegetarian");
  await page.getByRole("button", { name: "Save Fuel preferences" }).click();
  await expect(page.getByText("Fuel preferences saved")).toBeVisible();
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page.getByLabel("Shopping item").fill("Synthetic fruit");
  await page.getByLabel("Estimated total cost (₹, optional)").fill("20");
  await page.getByRole("button", { name: "Save shopping item" }).click();
  await expect(page.getByText("Shopping item saved")).toBeVisible();
  await page.getByRole("checkbox", { name: "Bought Synthetic fruit" }).click();
  await expect(page.getByText("Shopping checklist saved")).toBeVisible();
  await expect(page.getByText("₹230", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add stash item" }).click();
  await page.getByLabel("Stash food").fill("Synthetic oats");
  await page.getByLabel("Quantity in stash").fill("1 packet");
  await page.getByLabel("Use-by / expiry from label (optional)").fill(today());
  await page.getByRole("button", { name: "Save stash item" }).click();
  await expect(page.getByText("Stash item saved")).toBeVisible();
  await expect(page.getByText("Use-by date today")).toBeVisible();
  await noOverflow(page);
  await page.reload();
  await navigate(page, "Fuel");
  await expect(
    page.getByText("Synthetic PG favourite", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Bought Synthetic fruit" }),
  ).toBeChecked();
  await expect(page.getByText("Use-by date today")).toBeVisible();
  await noOverflow(page);
});
test("production migration from genuine Academy v2 retains exact attendance snapshots offline", async ({
  page,
  context,
}) => {
  await ready(page);
  let state = initialState();
  const day = generateDay(state, today());
  day.note = "Synthetic legacy Academy note";
  day.habits.gym = true;
  state = saveDay(state, day);
  const { training: _t, fuel: _f, ...legacy } = state;
  const old = { ...legacy, schemaVersion: 2 };
  await page.evaluate(async (old) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("arc-academy", 1);
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put(old, "main");
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, old);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("A note for your future self")).toHaveValue(
    "Synthetic legacy Academy note",
  );
  await navigate(page, "Training");
  await page.getByRole("button", { name: /Running Save a quick log/ }).click();
  await expect(page.getByText("Running saved on this device")).toBeVisible();
  const stored = await page.evaluate(
    async () =>
      await new Promise<any>((resolve) => {
        const r = indexedDB.open("arc-academy", 1);
        r.onsuccess = () => {
          const db = r.result;
          const tx = db.transaction("state", "readonly");
          const g = tx.objectStore("state").get("main");
          g.onsuccess = () => resolve(g.result);
          tx.oncomplete = () => db.close();
        };
      }),
  );
  expect(stored.schemaVersion).toBe(3);
  expect(stored.days).toEqual(old.days);
  expect(stored.revisions).toEqual(old.revisions);
  expect(stored.subjects).toEqual(old.subjects);
  expect(stored.training.entries).toHaveLength(1);
});
