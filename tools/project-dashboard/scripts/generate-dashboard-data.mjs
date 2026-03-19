import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadDashboardData } from "../src/lib/dashboard-loader.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(workspaceRoot, "../..");
const outputDir = path.join(workspaceRoot, "src", "generated");
const outputFile = path.join(outputDir, "dashboard-data.js");

const data = await loadDashboardData({ repoRoot });

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputFile, `export default ${JSON.stringify(data, null, 2)};\n`, "utf8");

console.log(`Wrote ${path.relative(repoRoot, outputFile)}`);
