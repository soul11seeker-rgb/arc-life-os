import { beforeEach, describe, expect, it } from "vitest";
import {
  backupJSON,
  openDB,
  readState,
  restoreJSON,
  writeState,
} from "../src/storage/db";
import { initialState } from "../src/domain/model";
import { generateDay, saveDay } from "../src/domain/attendance";
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("arc-academy");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
describe("Durable local records", () => {
  it.each([null, false, 0, ""])(
    "does not reset or overwrite a damaged stored value (%j)",
    async (damaged) => {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put(damaged, "main");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      await expect(readState()).rejects.toThrow();
      await expect(
        writeState(initialState(), initialState()),
      ).rejects.toThrow();
      const check = await openDB();
      const value = await new Promise((resolve) => {
        const r = check
          .transaction("state", "readonly")
          .objectStore("state")
          .get("main");
        r.onsuccess = () => resolve(r.result);
      });
      check.close();
      expect(value).toBe(damaged);
    },
  );
  it("initializes a new device and saves/reopens attendance, activities and notes", async () => {
    let s = await readState();
    expect(s).toEqual(initialState());
    const day = generateDay(s, "2026-11-02");
    day.habits.study = true;
    day.habits.sport = true;
    day.note = "First day";
    day.sessions = [
      {
        id: "manual-1",
        yearId: "mbbs-2",
        entityId: "subject-0",
        rotationId: "",
        rotationName: "",
        name: "Pharmacology",
        kind: "lecture",
        time: "09:00",
        label: "Lecture one",
        status: "attended",
        source: "manual",
        reason: "",
      },
    ];
    s = saveDay(s, day);
    await writeState(s);
    const reopened = await readState();
    expect(reopened.days["2026-11-02"]).toEqual(s.days["2026-11-02"]);
  });
  it("exports and restores full versioned records without dropping clinical/configuration history", async () => {
    let s = initialState();
    s.departments.push({
      id: "d",
      name: "Department",
      target: 75,
      archived: false,
    });
    s.exams.push({
      id: "exam",
      yearId: "mbbs-2",
      date: "2027-03-04",
      name: "Internal exam",
    });
    s = saveDay(s, generateDay(s, "2026-11-02"));
    const json = backupJSON(s);
    const restored = restoreJSON(json);
    await writeState(restored);
    expect(await readState()).toEqual(s);
    expect(backupJSON(await readState())).toBe(json);
  });
  it("rejects a malformed restore before changing existing data", async () => {
    const s = initialState();
    await writeState(s);
    expect(() => restoreJSON("{broken")).toThrow();
    expect(() =>
      restoreJSON(JSON.stringify({ ...s, currentYearId: "unknown" })),
    ).toThrow();
    expect(await readState()).toEqual(s);
  });
  it("rejects an invalid write without damaging a valid stored record", async () => {
    const s = initialState();
    await writeState(s);
    await expect(
      writeState({ ...s, currentYearId: "missing" }),
    ).rejects.toThrow();
    expect(await readState()).toEqual(s);
  });
  it("detects stale tabs and avoids overwriting a newer save", async () => {
    const old = initialState();
    await writeState(old);
    const tabA = await readState();
    const tabB = await readState();
    tabA.settings.warningMargin = 10;
    await writeState(tabA, old);
    tabB.settings.warningMargin = 20;
    await expect(writeState(tabB, old)).rejects.toThrow(/Another ARC tab/);
    expect((await readState()).settings.warningMargin).toBe(10);
  });
  it("works with network unavailable and never calls fetch to save/read", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error("Network offline"));
    try {
      const s = saveDay(
        initialState(),
        generateDay(initialState(), "2026-11-02"),
      );
      await writeState(s);
      expect(await readState()).toEqual(s);
    } finally {
      globalThis.fetch = original;
    }
  });
});
