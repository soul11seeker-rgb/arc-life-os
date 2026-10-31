import { test, expect } from "@playwright/test";
test("production installation, genuinely offline save/reload, CSV and backup restore", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.getByText("Offline ready", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "work/screenshots/arc-desktop.png",
    fullPage: true,
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Today's lineup")).toBeVisible();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add session", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Subject", exact: true })
    .selectOption("subject-0");
  await dialog.getByRole("button", { name: "Add to day" }).click();
  await page
    .getByRole("group", { name: /Pharmacology lecture/ })
    .getByRole("button", { name: "Attended", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Study/ }).check();
  await page
    .getByLabel("A note for your future self")
    .fill("Synthetic browser test record");
  await page.getByRole("button", { name: "SAVE DAY" }).click();
  await expect(page.getByText("Day saved on this device")).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("group", { name: /Pharmacology lecture/ })
      .getByRole("button", { name: "Attended", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("checkbox", { name: /Study/ })).toBeChecked();
  await expect(page.getByLabel("A note for your future self")).toHaveValue(
    "Synthetic browser test record",
  );
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("button", { name: "Attendance", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Attendance command." }),
  ).toBeVisible();
  const csvEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csv = await csvEvent;
  expect(csv.suggestedFilename()).toMatch(/^arc-attendance-.*\.csv$/);
  await nav.getByRole("button", { name: "Settings", exact: true }).click();
  const backupEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON backup" }).click();
  const backup = await backupEvent;
  const backupPath = await backup.path();
  expect(backupPath).toBeTruthy();
  // Mutate a real saved day, then restore the downloaded snapshot offline.
  await nav.getByRole("button", { name: "Today", exact: true }).click();
  await page
    .getByLabel("A note for your future self")
    .fill("Changed after backup");
  await page.getByRole("button", { name: "SAVE DAY" }).click();
  await expect(page.getByText("Day saved on this device")).toBeVisible();
  await nav.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Import backup file").setInputFiles(backupPath!);
  dialog = page.getByRole("dialog");
  await expect(dialog.getByText("1 saved days")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Download current & restore" })
    .click();
  await expect(page.getByText("Backup restored successfully")).toBeVisible();
  await nav.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByLabel("A note for your future self")).toHaveValue(
    "Synthetic browser test record",
  );
  expect(errors).toEqual([]);
});
test("iPhone layout, date correction and navigation stay usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto("./");
  await expect(page.getByText("Offline ready", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "work/screenshots/arc-iphone.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const quick = page.getByRole("navigation", { name: "Quick navigation" });
  await quick.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your timeline." }),
  ).toBeVisible();
  await page.locator(".calendar-cell").nth(8).click();
  await expect(page.getByLabel("Log date")).toBeVisible();
  await page.getByRole("checkbox", { name: /Gym/ }).check();
  await page.getByRole("button", { name: "SAVE DAY" }).click();
  await expect(page.getByText("Day saved on this device")).toBeVisible();
  await quick.getByRole("button", { name: "More", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Timetable", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Timetable & breaks." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
