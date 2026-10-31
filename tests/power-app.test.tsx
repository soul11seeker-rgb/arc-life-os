import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { readState, writeState } from "../src/storage/db";
import * as storage from "../src/storage/db";
import { today } from "../src/domain/model";
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("arc-academy");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
function nav(name: string) {
  return within(
    screen.getByRole("navigation", { name: "Main navigation" }),
  ).getByRole("button", { name });
}
async function open(view: string) {
  const user = userEvent.setup();
  const rendered = render(<App />);
  await screen.findByText("Today's lineup");
  await user.click(nav(view));
  return { user, ...rendered };
}
describe("Power-up user flows", () => {
  it("quick-logs movement and recovery, edits a checkbox and survives reopen", async () => {
    const { user, unmount } = await open("Training");
    await user.click(
      screen.getByRole("button", { name: /Gym Save a quick log/ }),
    );
    await screen.findByText("Gym saved on this device");
    await user.click(
      screen.getByRole("button", { name: /Football Save a quick log/ }),
    );
    await screen.findByText("Football saved on this device");
    await user.click(
      screen.getByRole("button", { name: /Recovery \/ rest Save a quick log/ }),
    );
    await screen.findByText("Recovery / rest saved on this device");
    expect((await readState()).training.entries).toHaveLength(3);
    expect((await readState()).days).toEqual({});
    await user.click(
      screen.getByRole("checkbox", { name: `Completed Gym ${today()}` }),
    );
    await screen.findByText("Workout checkbox saved");
    unmount();
    await open("Training");
    expect(
      screen.getByRole("checkbox", { name: `Completed Gym ${today()}` }),
    ).not.toBeChecked();
  });
  it("saves detailed workouts including an entered optional exercise", async () => {
    const { user } = await open("Training");
    await user.click(screen.getAllByRole("button", { name: "Add details" })[0]);
    await user.type(screen.getByLabelText("Minutes (optional)"), "25");
    await user.type(
      screen.getByLabelText("Session note (optional)"),
      "Easy start",
    );
    await user.click(screen.getByText("Optional exercises (0)"));
    await user.type(screen.getByLabelText("Exercise name"), "Squat");
    await user.type(screen.getByLabelText("Sets", { exact: true }), "2");
    await user.type(screen.getByLabelText("Repetitions"), "8");
    await user.type(screen.getByLabelText("Exercise weight (kg)"), "0");
    await user.click(screen.getByRole("button", { name: "Save Training log" }));
    await screen.findByText("Training log saved on this device");
    expect((await readState()).training.entries[0]).toMatchObject({
      minutes: 25,
      note: "Easy start",
      exercises: [{ name: "Squat", sets: 2, reps: 8, weightKg: 0, done: true }],
    });
  });
  it("logs an unknown PG meal with no fabricated nutrition", async () => {
    const { user } = await open("Fuel");
    await user.click(screen.getByRole("button", { name: "Log lunch" }));
    await user.type(
      screen.getByLabelText("Food / PG meal name"),
      "PG mixed lunch",
    );
    await user.click(screen.getByRole("button", { name: "Save meal item" }));
    await screen.findByText("Meal saved on this device");
    const m = (await readState()).fuel.meals[0];
    expect(m.name).toBe("PG mixed lunch");
    expect(m.quantity).toBeUndefined();
    expect(m.nutrients).toEqual({});
    expect(screen.getAllByText("insufficient data")).toHaveLength(6);
    expect(screen.getByText("Nutrition not estimated")).toBeInTheDocument();
  });
  it("estimates an explicitly confirmed egg serving and reopens a completed day when edited", async () => {
    const { user } = await open("Fuel");
    await user.click(screen.getByRole("button", { name: "Log breakfast" }));
    await user.selectOptions(
      screen.getByLabelText("Food or favourite PG meal"),
      "egg",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "I know the quantity and it matches this serving",
      }),
    );
    fireEvent.change(screen.getByLabelText("Number of units"), {
      target: { value: "2" },
    });
    await user.click(screen.getByRole("button", { name: "Save meal item" }));
    await screen.findByText("Meal saved on this device");
    expect((await readState()).fuel.meals[0].quantity).toBe(2);
    await user.click(
      screen.getByRole("checkbox", {
        name: "I have logged all food and drinks for this day",
      }),
    );
    await screen.findByText("Food-log completeness saved");
    expect(screen.getAllByText("estimated gap").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Edit Boiled egg" }));
    await user.click(screen.getByRole("button", { name: "Save meal item" }));
    await screen.findByText("Meal saved on this device");
    expect((await readState()).fuel.completeDays).toEqual([]);
  });
  it("retains a failed Training draft and shows no success message", async () => {
    const { user } = await open("Training");
    await writeState(await readState());
    await user.click(screen.getAllByRole("button", { name: "Add details" })[0]);
    await user.type(
      screen.getByLabelText("Session note (optional)"),
      "Keep this draft",
    );
    const spy = vi
      .spyOn(storage, "writeState")
      .mockRejectedValue(new Error("Simulated storage failure"));
    try {
      await user.click(
        screen.getByRole("button", { name: "Save Training log" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Simulated storage failure",
      );
      expect(screen.getByLabelText("Session note (optional)")).toHaveValue(
        "Keep this draft",
      );
      expect(
        screen.queryByText("Training log saved on this device"),
      ).not.toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });
  it("keeps unrelated check-in drafts protected after a quick session save", async () => {
    const { user } = await open("Training");
    await user.type(screen.getByLabelText("Body weight (kg)"), "70");
    await user.click(
      screen.getByRole("button", { name: /Gym Save a quick log/ }),
    );
    await screen.findByText("Gym saved on this device");
    vi.mocked(window.confirm).mockReturnValue(false);
    await user.click(nav("Fuel"));
    expect(window.confirm).toHaveBeenCalledWith(
      "You have unsaved changes. Discard them and continue?",
    );
    expect(screen.getByLabelText("Body weight (kg)")).toHaveValue(70);
    fireEvent.change(screen.getByLabelText("Activity date"), {
      target: { value: "2026-10-01" },
    });
    expect(screen.getByLabelText("Body weight (kg)")).toHaveValue(70);
  });
  it("creates a PG favourite, shopping price and a shelf item without assuming nutrients or expiry", async () => {
    const { user } = await open("Fuel");
    await user.click(
      screen.getByRole("button", { name: "New food / PG meal" }),
    );
    await user.type(screen.getByLabelText("Custom food name"), "My PG dinner");
    await user.type(
      screen.getByLabelText("Portion description"),
      "One plate, recipe unknown",
    );
    await user.click(screen.getByRole("button", { name: "Save custom food" }));
    await screen.findByText("Custom food saved; previous meals unchanged");
    expect((await readState()).fuel.foods[0].nutrients).toEqual({});
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.type(screen.getByLabelText("Shopping item"), "Guava");
    await user.type(
      screen.getByLabelText("Estimated total cost (₹, optional)"),
      "25",
    );
    await user.click(
      screen.getByRole("button", { name: "Save shopping item" }),
    );
    await screen.findByText("Shopping item saved");
    await user.click(screen.getByRole("checkbox", { name: "Bought Guava" }));
    await screen.findByText("Shopping checklist saved");
    await user.click(screen.getByRole("button", { name: "Add stash item" }));
    await user.type(screen.getByLabelText("Stash food"), "Oats");
    await user.type(screen.getByLabelText("Quantity in stash"), "1 packet");
    await user.click(screen.getByRole("button", { name: "Save stash item" }));
    await screen.findByText("Stash item saved");
    await waitFor(async () => {
      const s = await readState();
      expect(s.fuel.shopping[0]).toMatchObject({ checked: true, cost: 25 });
      expect(s.fuel.pantry[0].expires).toBeUndefined();
    });
  });
});
