import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
const template = readFileSync("scripts/sw-template.js", "utf8");
function worker(failInstall = false) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const entries = new Map<string, { body: string }>();
  const match = vi.fn(async (req: string | { url: string }) =>
    entries.get(typeof req === "string" ? req : new URL(req.url).pathname),
  );
  const addAll = vi.fn(async (urls: string[]) => {
    if (failInstall) throw new Error("Download interrupted");
    urls.forEach((url) => entries.set(url, { body: `cached:${url}` }));
  });
  const cache = { match, addAll };
  const fetch = vi.fn(() => Promise.reject(new Error("Offline")));
  const remove = vi.fn(async () => true);
  const claim = vi.fn(async () => undefined);
  const skip = vi.fn();
  const context = {
    URL,
    caches: {
      open: vi.fn(async () => cache),
      keys: vi.fn(async () => [
        "arc-academy:/arc-life-os/:old",
        "arc-academy:/arc-life-os/:test",
        "some-other-app",
      ]),
      delete: remove,
    },
    self: {
      addEventListener: (key: string, fn: (e: unknown) => void) =>
        (handlers[key] = fn),
      location: { origin: "https://example.test" },
      clients: { claim },
      skipWaiting: skip,
    },
    fetch,
  };
  vm.runInNewContext(
    `const BASE='/arc-life-os/';const CACHE_PREFIX='arc-academy:/arc-life-os/:';const CACHE_NAME=CACHE_PREFIX+'test';const PRECACHE=['/arc-life-os/index.html','/arc-life-os/assets/main.js','/arc-life-os/assets/main.css'];${template}`,
    context,
  );
  async function event(type: string, extra: Record<string, unknown> = {}) {
    let pending: Promise<unknown> | undefined;
    handlers[type]({
      ...extra,
      waitUntil: (p: Promise<unknown>) => (pending = p),
      respondWith: (p: Promise<unknown>) => (pending = p),
    });
    return pending ? await pending : undefined;
  }
  return { event, entries, fetch, remove, claim, skip, addAll };
}
describe("Offline service worker", () => {
  it("precaches the complete local shell during installation", async () => {
    const w = worker();
    await w.event("install");
    expect(w.entries.size).toBe(3);
    expect(w.addAll).toHaveBeenCalledOnce();
  });
  it("rejects incomplete installation instead of claiming offline readiness", async () => {
    await expect(worker(true).event("install")).rejects.toThrow(/interrupted/);
  });
  it("opens/reloads the application and serves JS/CSS without any network", async () => {
    const w = worker();
    await w.event("install");
    const navigation = await w.event("fetch", {
      request: {
        url: "https://example.test/arc-life-os/?date=2026-11-02",
        method: "GET",
        mode: "navigate",
      },
    });
    expect(navigation).toEqual({ body: "cached:/arc-life-os/index.html" });
    for (const file of ["main.js", "main.css"])
      expect(
        await w.event("fetch", {
          request: {
            url: `https://example.test/arc-life-os/assets/${file}`,
            method: "GET",
            mode: "cors",
          },
        }),
      ).toEqual({ body: `cached:/arc-life-os/assets/${file}` });
    expect(w.fetch).not.toHaveBeenCalled();
  });
  it("does not intercept other origins, scopes or write requests", async () => {
    const w = worker();
    await w.event("install");
    for (const request of [
      { url: "https://external.test/arc-life-os/private", method: "GET" },
      { url: "https://example.test/other/", method: "GET" },
      { url: "https://example.test/arc-life-os/", method: "POST" },
    ])
      expect(await w.event("fetch", { request })).toBeUndefined();
    expect(w.fetch).not.toHaveBeenCalled();
  });
  it("removes only old ARC caches for this scope and activates client control", async () => {
    const w = worker();
    await w.event("activate");
    expect(w.remove).toHaveBeenCalledExactlyOnceWith(
      "arc-academy:/arc-life-os/:old",
    );
    expect(w.claim).toHaveBeenCalledOnce();
  });
  it("updates only when requested, preserving an open logging session", async () => {
    const w = worker();
    await w.event("install");
    expect(w.skip).not.toHaveBeenCalled();
    await w.event("message", { data: { type: "SKIP_WAITING" } });
    expect(w.skip).toHaveBeenCalledOnce();
  });
});
