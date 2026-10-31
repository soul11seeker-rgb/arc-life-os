import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const base = process.env.VITE_BASE_PATH || "/arc-life-os/";
if (!base.startsWith("/") || !base.endsWith("/"))
  throw new Error("VITE_BASE_PATH must begin and end with /");
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries
        .filter((x) => x.name !== "sw.js")
        .map((x) =>
          x.isDirectory()
            ? walk(path.join(dir, x.name))
            : path.join(dir, x.name),
        ),
    )
  ).flat();
}
const paths = (await walk("dist")).sort();
const hash = createHash("sha256");
for (const p of paths) hash.update(await readFile(p));
const urls = paths.map((p) => base + p.replace(/^dist\//, ""));
const cachePrefix = `arc-academy:${base}:`;
const version = hash.digest("hex").slice(0, 16);
const template = await readFile("scripts/sw-template.js", "utf8");
await writeFile(
  "dist/sw.js",
  `const BASE=${JSON.stringify(base)};\nconst CACHE_PREFIX=${JSON.stringify(cachePrefix)};\nconst CACHE_NAME=CACHE_PREFIX+${JSON.stringify(version)};\nconst PRECACHE=${JSON.stringify(urls)};\n${template}`,
);
console.log(
  `Offline worker: ${urls.length} local files, version ${version}, scope ${base}`,
);
