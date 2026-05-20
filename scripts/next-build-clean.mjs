import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const requestedFlags = [
  "--disable-warning=DEP0205",
  "--no-experimental-webstorage",
];

const supportedFlags = requestedFlags.filter((flag) => process.allowedNodeEnvironmentFlags.has(flag));
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const nodeOptions = [existingNodeOptions, ...supportedFlags].filter(Boolean).join(" ");

const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

const child = spawn(process.execPath, [nextBin, "build"], {
  env: {
    ...process.env,
    ...(nodeOptions ? { NODE_OPTIONS: nodeOptions } : {}),
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
