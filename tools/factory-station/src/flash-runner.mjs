import { spawn } from "node:child_process";

const [firmwareCwd, argsJson] = process.argv.slice(2);

if (!firmwareCwd || !argsJson) {
  console.error("Usage: flash-runner.mjs <firmware-cwd> <pio-args-json>");
  process.exit(2);
}

let pioArgs;
try {
  pioArgs = JSON.parse(argsJson);
  if (!Array.isArray(pioArgs)) {
    throw new Error("pio args must be an array");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid flash-runner arguments.");
  process.exit(2);
}

const child = spawn("pio", pioArgs, {
  cwd: firmwareCwd,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : "Failed to launch PlatformIO.");
  process.exit(1);
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});
