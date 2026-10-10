// Encode each captured shot to a constant-60fps, near-lossless H.264 clip from screencast timestamps.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
const root = "tmp/film/cap";
for (const name of readdirSync(root)) {
  const meta = `${root}/${name}/frames.json`; if (!existsSync(meta)) continue;
  if (existsSync(`tmp/film/${name}.mp4`) && statSync(`tmp/film/${name}.mp4`).mtimeMs > statSync(meta).mtimeMs) continue;
  const { frames, marks } = JSON.parse(readFileSync(meta, "utf8"));
  let list = "ffconcat version 1.0\n";
  frames.forEach((f, i) => { const d = (frames[i + 1]?.t ?? f.t + 0.5) - f.t; list += `file '${f.file.split("/").pop()}'\nduration ${Math.max(0.001, d).toFixed(4)}\n`; });
  list += `file '${frames.at(-1).file.split("/").pop()}'\n`;
  writeFileSync(`${root}/${name}/list.txt`, list);
  execFileSync("/opt/homebrew/bin/ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", `${root}/${name}/list.txt`, "-vf", "fps=60,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "12", `tmp/film/${name}.mp4`]);
  writeFileSync(`tmp/film/${name}.marks.json`, JSON.stringify(marks));
  console.log("encoded", name, frames.length, "frames");
}
console.log("DONE");
