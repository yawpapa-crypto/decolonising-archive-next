// Installs a git pre-push hook that runs the quick layout check when the dev server is up.
import { writeFileSync, chmodSync, existsSync } from "node:fs";
const hook = ".git/hooks/pre-push";
if (!existsSync(".git")) { console.log("Not a git checkout; nothing to install."); process.exit(0); }
writeFileSync(hook, `#!/bin/sh
# ARED: layout and contrast check before pushing (skips when no local server is running).
if curl -s -o /dev/null --max-time 3 http://localhost:3000/home-next; then
  npm run --silent audit:layout:quick || { echo "Layout check failed. Fix it, or push with --no-verify to skip."; exit 1; }
else
  echo "Layout check skipped: start the dev server (npm run dev) to run it before pushing."
fi
`);
chmodSync(hook, 0o755);
console.log("Installed " + hook);
