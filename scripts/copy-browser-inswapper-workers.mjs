import { mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(projectRoot, "vendor", "browser-inswapper", "dist");
const publicDirectory = path.join(projectRoot, "public", "vendor", "browser-inswapper");

await mkdir(publicDirectory, { recursive: true });
for (const worker of ["worker.js", "segment-worker.js"]) {
    await copyFile(path.join(sourceDirectory, worker), path.join(publicDirectory, worker));
}
