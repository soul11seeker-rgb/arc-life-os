import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialState, parseState } from "../src/domain/model";
import type { State } from "../src/domain/model";
import { generateDay, saveDay } from "../src/domain/attendance";
import {
  backupJSON,
  openDB,
  readState,
  restoreJSON,
  writeState,
} from "../src/storage/db";
import { foods } from "../src/domain/nutrition";
async function rawPut(value: unknown) {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(value, "main");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function rawRead() {
  const db = await openDB();
  const result = await new Promise((resolve) => {
    const r = db
      .transaction("state", "readonly")
      .objectStore("state")
      .get("main");
    r.onsuccess = () => resolve(r.result);
  });
  db.close();
  return result;
}
function populated() {
  let s = initialState();
  s.departments = [
    { id: "medicine", name: "Medicine", archived: false, target: 75 },
  ];
  s.rotations = [
    {
      id: "r1",
      name: "Clinical posting",
      yearId: "mbbs-2",
      departmentId: "medicine",
      start: "2026-11-02",
      end: "2026-12-01",
      weekdays: [1],
      time: "10:00",
      archived: false,
      target: 75,
    },
  ];
  s.slots = [
    {
      id: "slot",
      name: "unused",
      yearId: "mbbs-2",
      subjectId: "subject-0",
      kind: "lecture",
      weekday: 1,
      time: "09:00",
      label: "Lecture",
      from: "2026-11-02",
      to: "2027-01-01",
      archived: false,
    } as State["slots"][number],
  ];
  const day = generateDay(s, "2026-11-02");
  day.sessions.forEach((x) => (x.status = "attended"));
  day.note = "Synthetic attendance note";
  day.habits.gym = true;
  s = saveDay(s, day);
  return parseState(s);
}
function legacy(version: 1 | 2) {
  const s = populated();
  const { training: _t, fuel: _f, ...old } = s;
  return {
    ...old,
    schemaVersion: version,
    ...(version === 1 ? { exams: undefined, revisions: undefined } : {}),
  };
}
beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase("arc-academy");
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
});
describe("Sequential non-destructive application migrations", () => {
  it.each([1, 2] as const)(
    "migrates true legacy v%s without altering Academy snapshots or input",
    async (version) => {
      const old = legacy(version);
      const before = JSON.stringify(old);
      await rawPut(old);
      const migrated = await readState();
      expect(migrated.schemaVersion).toBe(3);
      expect(migrated.training.entries).toEqual([]);
      expect(migrated.fuel.meals).toEqual([]);
      for (const key of [
        "days",
        "subjects",
        "departments",
        "rotations",
        "slots",
        "years",
        "settings",
      ] as const)
        expect(migrated[key]).toEqual(old[key]);
      expect(JSON.stringify(old)).toBe(before);
      expect(await rawRead()).toEqual(old); // Read migration is pure, not a write.
      await writeState(
        {
          ...migrated,
          training: {
            ...migrated.training,
            entries: [
              {
                id: "gym",
                date: "2026-11-02",
                kind: "gym",
                completed: true,
                note: "",
                exercises: [],
              },
            ],
          },
        },
        migrated,
      );
      expect((await readState()).days).toEqual(old.days);
    },
  );
  it("is idempotent and preserves revision history from v2", () => {
    const old = legacy(2);
    const next = parseState(old);
    expect(next.revisions).toEqual(old.revisions);
    expect(parseState(next)).toEqual(next);
  });
  it("rejects damaged legacy Academy records before appending defaults", async () => {
    const old = { ...legacy(2), currentYearId: "missing" };
    await rawPut(old);
    await expect(readState()).rejects.toThrow();
    await expect(writeState(initialState())).rejects.toThrow();
    expect(await rawRead()).toEqual(old);
  });
  it("rejects unknown future versions without touching their data", async () => {
    const future = { ...populated(), schemaVersion: 4 };
    await rawPut(future);
    await expect(readState()).rejects.toThrow(/Unsupported/);
    await expect(writeState(initialState())).rejects.toThrow(/Unsupported/);
    expect(await rawRead()).toEqual(future);
  });
  it("rejects missing or malformed current-version modules rather than defaulting them", () => {
    expect(() =>
      parseState({ ...initialState(), training: undefined }),
    ).toThrow();
    expect(() => parseState({ ...initialState(), fuel: null })).toThrow();
    expect(() =>
      parseState({ ...legacy(2), training: { entries: "damaged" } }),
    ).toThrow();
  });
  it("keeps legacy backup imports compatible", () => {
    for (const version of [1, 2] as const) {
      const old = legacy(version);
      expect(restoreJSON(JSON.stringify(old)).days).toEqual(old.days);
    }
  });
});
describe("Offline durability and full backup safety", () => {
  function fullState() {
    const s = populated();
    s.training.entries = [
      {
        id: "t",
        date: "2026-11-02",
        kind: "running",
        completed: true,
        minutes: 15,
        distanceKm: 1.5,
        note: "Synthetic run",
        exercises: [],
      },
    ];
    s.training.wellness = [
      {
        date: "2026-11-02",
        weightKg: 70,
        sleepHours: 7,
        energy: 4,
        digestion: "comfortable",
      },
    ];
    s.training.goals.sportsWeekly = 2;
    s.fuel.foods = [{ ...foods[0], id: "custom", favourite: true }];
    s.fuel.meals = [
      {
        ...foods[0],
        id: "meal",
        date: "2026-11-02",
        slot: "breakfast",
        quantity: 2,
      },
    ];
    s.fuel.completeDays = ["2026-11-02"];
    s.fuel.pantry = [
      {
        id: "p",
        name: "Oats",
        quantity: "1 packet",
        storage: "shelf",
        expires: "2026-12-01",
      },
    ];
    s.fuel.shopping = [{ id: "s", name: "Guava", checked: true, cost: 25 }];
    s.fuel.preferences.weeklyBudget = 300;
    return parseState(s);
  }
  it("saves, reopens and round-trips every module with fetch unavailable", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Offline"));
    try {
      const s = fullState();
      await writeState(s);
      expect(await readState()).toEqual(s);
      const json = backupJSON(await readState());
      await writeState(restoreJSON(json), s);
      expect(backupJSON(await readState())).toBe(json);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
  it("preserves all stored records on an interrupted/quota write", async () => {
    const s = fullState();
    await writeState(s);
    const next = structuredClone(s);
    next.training.entries = [];
    const put = vi
      .spyOn(IDBObjectStore.prototype, "put")
      .mockImplementation(() => {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      });
    try {
      await expect(writeState(next, s)).rejects.toThrow(/quota/);
    } finally {
      put.mockRestore();
    }
    expect(await readState()).toEqual(s);
  });
  it("detects a stale Academy tab after a Training save", async () => {
    const s = fullState();
    await writeState(s);
    const newer = structuredClone(s);
    newer.training.goals.gymWeekly = 2;
    await writeState(newer, s);
    await expect(
      writeState(saveDay(s, generateDay(s, "2026-11-03")), s),
    ).rejects.toThrow(/Another ARC tab/);
    expect(await readState()).toEqual(newer);
  });
  it("rejects a malformed module backup without partial writes", async () => {
    const s = fullState();
    await writeState(s);
    const bad = {
      ...s,
      fuel: { ...s.fuel, meals: [{ ...s.fuel.meals[0], quantity: -4 }] },
    };
    expect(() => restoreJSON(JSON.stringify(bad))).toThrow();
    await expect(writeState(bad)).rejects.toThrow();
    expect(await readState()).toEqual(s);
  });
  it("rejects duplicate module identities and same-date check-ins", () => {
    const s = fullState();
    expect(() =>
      parseState({
        ...s,
        training: {
          ...s.training,
          entries: [...s.training.entries, s.training.entries[0]],
        },
      }),
    ).toThrow(/Duplicate/);
    expect(() =>
      parseState({
        ...s,
        training: {
          ...s.training,
          wellness: [...s.training.wellness, s.training.wellness[0]],
        },
      }),
    ).toThrow(/Duplicate/);
    expect(() =>
      parseState({
        ...s,
        fuel: { ...s.fuel, meals: [...s.fuel.meals, s.fuel.meals[0]] },
      }),
    ).toThrow(/Duplicate/);
  });
});
