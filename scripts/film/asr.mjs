// Transcribe the supplied voice on this Mac (Hugging Face is reachable here, not in the cloud).
import { execSync } from "node:child_process";
const run = (c) => { console.log("$ " + c); try { console.log(execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 })); } catch (e) { console.log("ERR", (e.stderr || e.message || "").toString().slice(-1500)); } };
run("which python3; python3 --version");
run("tmp/film/venv/bin/python scripts/film/asr.py");
console.log("DONE");
