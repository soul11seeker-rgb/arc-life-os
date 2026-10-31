import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { initialState, shiftDate, today } from "../src/domain/model";
import { readState, writeState } from "../src/storage/db";
import * as storage from "../src/storage/db";
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("arc-academy");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
async function open() {
  const user = userEvent.setup();
  const result = render(<App />);
  await screen.findByText("Today's lineup");
  return { user, ...result };
}
function nav(name: string) {
  return within(
    screen.getByRole("navigation", { name: "Main navigation" }),
  ).getByRole("button", { name });
}
describe("Academy user flows", () => {
  it("holds the displayed draft steady while saving and unlocks only after the transaction completes", async () => {
    const { user } = await open();
    await user.type(
      screen.getByLabelText("A note for your future self"),
      "My saved note",
    );
    const original = storage.writeState;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const spy = vi
      .spyOn(storage, "writeState")
      .mockImplementation(async (...args) => {
        await gate;
        await original(...args);
      });
    try {
      await user.click(screen.getByRole("button", { name: /SAVE DAY/ }));
      expect(screen.getByRole("main")).toHaveAttribute("inert");
      expect(screen.getByRole("button", { name: /SAVING/ })).toBeDisabled();
      fireEvent.change(screen.getByLabelText("A note for your future self"), {
        target: { value: "Edit during pending save" },
      });
      release();
      await screen.findByText("Day saved on this device");
      expect(screen.getByRole("main")).not.toHaveAttribute("inert");
      expect(screen.getByLabelText("A note for your future self")).toHaveValue(
        "My saved note",
      );
      expect((await readState()).days[today()].note).toBe("My saved note");
    } finally {
      release();
      spy.mockRestore();
    }
  });
  it("shows accurate empty state instead of fabricated statistics", async () => {
    await open();
    expect(
      screen.getByText("A blank page. Your next chapter."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("No recorded sessions")).toHaveLength(3);
    expect(screen.getByRole("button", { name: /SAVE DAY/ })).toBeEnabled();
  });
  it("adds two lectures, independently marks them, ticks an activity, saves and survives reopen", async () => {
    const { user, unmount } = await open();
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole("button", { name: /Add session/ }));
      const dialog = screen.getByRole("dialog");
      await user.selectOptions(
        within(dialog).getByLabelText("Subject"),
        "subject-0",
      );
      await user.click(
        within(dialog).getByRole("button", { name: "Add to day" }),
      );
    }
    let groups = screen.getAllByRole("group", { name: /Pharmacology lecture/ });
    await user.click(
      within(groups[0]).getByRole("button", { name: "Attended" }),
    );
    await user.click(within(groups[1]).getByRole("button", { name: "Absent" }));
    await user.click(screen.getByRole("checkbox", { name: /Study/ }));
    await user.click(screen.getByRole("button", { name: /SAVE DAY/ }));
    await screen.findByText("Day saved on this device");
    const s = await readState();
    expect(s.days[today()].sessions.map((x) => x.status)).toEqual([
      "attended",
      "absent",
    ]);
    expect(s.days[today()].habits.study).toBe(true);
    unmount();
    await open();
    groups = screen.getAllByRole("group", { name: /Pharmacology lecture/ });
    expect(
      within(groups[0]).getByRole("button", { name: "Attended" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("checkbox", { name: /Study/ })).toBeChecked();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
  });
  it("saves a previous date and edits it through the calendar", async () => {
    const { user } = await open();
    const past = shiftDate(today(), -1);
    fireEvent.change(screen.getByLabelText("Log date"), {
      target: { value: past },
    });
    await user.type(
      screen.getByLabelText("A note for your future self"),
      "A note",
    );
    await user.click(screen.getByRole("button", { name: /SAVE DAY/ }));
    await screen.findByText("Day saved on this device");
    await user.click(nav("Calendar"));
    await screen.findByText("Your timeline");
    const dateButton = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label")?.includes(", saved day"));
    expect(dateButton).toBeDefined();
    await user.click(dateButton!);
    expect(screen.getByLabelText("A note for your future self")).toHaveValue(
      "A note",
    );
    await user.clear(screen.getByLabelText("A note for your future self"));
    await user.type(
      screen.getByLabelText("A note for your future self"),
      "Corrected",
    );
    await user.click(screen.getByRole("button", { name: /SAVE DAY/ }));
    await waitFor(async () =>
      expect((await readState()).days[past].note).toBe("Corrected"),
    );
  });
  it("configures a clinical department and rotation with no assumed departments", async () => {
    const { user } = await open();
    await user.click(nav("Clinical"));
    expect(
      screen.getByText("Your clinical chapter is unwritten"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add department" }));
    await user.type(screen.getByLabelText("Name"), "General Medicine");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("heading", { name: "General Medicine" });
    await user.click(screen.getByRole("button", { name: "Add rotation" }));
    await user.type(screen.getByLabelText("Name"), "First rotation");
    await user.selectOptions(
      screen.getByLabelText("Department"),
      (await readState()).departments[0].id,
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("heading", { name: "First rotation" });
    expect((await readState()).rotations).toHaveLength(1);
    const configured = await readState();
    await user.click(nav("Today"));
    await user.click(screen.getByRole("button", { name: "Add session" }));
    await user.selectOptions(screen.getByLabelText("Session type"), "clinical");
    await user.selectOptions(
      screen.getByLabelText("Department"),
      configured.departments[0].id,
    );
    await user.selectOptions(
      screen.getByLabelText("Rotation (optional)"),
      configured.rotations[0].id,
    );
    await user.click(screen.getByRole("button", { name: "Add to day" }));
    const clinicalGroup = screen.getByRole("group", {
      name: /General Medicine clinical/,
    });
    await user.click(
      within(clinicalGroup).getByRole("button", { name: "Attended" }),
    );
    await user.click(screen.getByRole("button", { name: /SAVE DAY/ }));
    await screen.findByText("Day saved on this device");
    expect((await readState()).days[today()].sessions[0]).toMatchObject({
      rotationId: configured.rotations[0].id,
      rotationName: "First rotation",
      kind: "clinical",
      status: "attended",
    });
  });
  it("allows timetable setup with separate practicals and confirmed holiday ranges", async () => {
    const { user } = await open();
    await user.click(nav("Timetable"));
    await user.click(screen.getByRole("button", { name: "Add weekly class" }));
    await user.selectOptions(screen.getByLabelText("Subject"), "subject-0");
    await user.selectOptions(screen.getByLabelText("Type"), "practical");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("heading", { name: "Pharmacology" });
    expect((await readState()).slots[0].kind).toBe("practical");
    await user.click(screen.getByRole("button", { name: "Add date rule" }));
    await user.type(screen.getByLabelText("Name"), "Confirmed break");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("heading", { name: "Confirmed break" });
    expect((await readState()).exceptions).toHaveLength(1);
  });
  it("continues daily logging when the device reports offline", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    const { user } = await open();
    expect(screen.getByText("Offline", { exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Gym/ }));
    await user.click(screen.getByRole("button", { name: /SAVE DAY/ }));
    await screen.findByText("Day saved on this device");
    expect((await readState()).days[today()].habits.gym).toBe(true);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });
  it("preserves changes on a failed save and never shows a false success", async () => {
    await writeState(initialState());
    const { user } = await open();
    const newer = await readState();
    newer.settings.warningMargin = 17;
    await writeState(newer);
    await user.type(
      screen.getByLabelText("A note for your future self"),
      "Keep this unsaved note",
    );
    await user.click(screen.getByRole("button", { name: /SAVE DAY/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Another ARC tab",
    );
    expect(screen.getByLabelText("A note for your future self")).toHaveValue(
      "Keep this unsaved note",
    );
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(
      screen.queryByText("Day saved on this device"),
    ).not.toBeInTheDocument();
  });
});
