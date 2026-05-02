import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const standaloneDir = ".next/standalone";
const standaloneNextDir = `${standaloneDir}/.next`;

if (!existsSync(`${standaloneDir}/server.js`)) {
  throw new Error(
    "Standalone server not found. Run `npm run build:dev` before preparing standalone assets.",
  );
}

await mkdir(standaloneNextDir, { recursive: true });

await rm(`${standaloneNextDir}/static`, { recursive: true, force: true });
await cp(".next/static", `${standaloneNextDir}/static`, { recursive: true });

if (existsSync("public")) {
  await rm(`${standaloneDir}/public`, { recursive: true, force: true });
  await cp("public", `${standaloneDir}/public`, { recursive: true });
}

console.log("Standalone assets prepared in .next/standalone");
