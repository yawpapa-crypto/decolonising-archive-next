import { spawnSync } from "node:child_process";
const r = spawnSync("npm", ["install", "--save-dev", "--save-exact", "playwright-core@1.48.2", "--no-audit", "--no-fund", "--ignore-scripts"], { stdio: "inherit", shell: true });
console.log("EXIT", r.status);
