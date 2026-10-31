import { initialState, parseState } from "../domain/model";
import type { State } from "../domain/model";
const DB = "arc-academy";
const STORE = "state";
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Close other ARC tabs and try again."));
  });
}
export async function readState(): Promise<State> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get("main");
      req.onsuccess = () => {
        try {
          resolve(
            req.result === undefined ? initialState() : parseState(req.result),
          );
        } catch (e) {
          reject(e);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
export async function writeState(
  state: State,
  expected?: State,
): Promise<void> {
  const valid = parseState(state);
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      let conflict: Error | null = null;
      const request = store.get("main");
      request.onsuccess = () => {
        try {
          if (
            expected &&
            request.result !== undefined &&
            JSON.stringify(parseState(request.result)) !==
              JSON.stringify(parseState(expected))
          ) {
            conflict = new Error(
              "Another ARC tab changed these records. Reload this tab before saving; avoid editing in two tabs.",
            );
            tx.abort();
            return;
          }
          store.put(valid, "main");
        } catch (error) {
          conflict =
            error instanceof Error
              ? error
              : new Error("Could not validate local data");
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(conflict ?? tx.error);
      tx.onabort = () =>
        reject(conflict ?? tx.error ?? new Error("Save was interrupted"));
    });
  } finally {
    db.close();
  }
}
export const backupJSON = (state: State) =>
  JSON.stringify(parseState(state), null, 2);
export const restoreJSON = (json: string) => parseState(JSON.parse(json));
export function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
