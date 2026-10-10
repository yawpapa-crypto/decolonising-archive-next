await import("./fetch-data.mjs");
await import("./capture-mobile.mjs");
const { readdirSync, readFileSync, writeFileSync, existsSync } = await import("node:fs");
const { execFileSync } = await import("node:child_process");
for (const name of readdirSync("tmp/film/capm")) { const meta = `tmp/film/capm/${name}/frames.json`; if (!existsSync(meta)) continue; const { frames, marks } = JSON.parse(readFileSync(meta, "utf8")); let list = "ffconcat version 1.0\n"; frames.forEach((f, i) => { const d = (frames[i + 1]?.t ?? f.t + 0.5) - f.t; list += `file '${f.file.split("/").pop()}'\nduration ${Math.max(0.001, d).toFixed(4)}\n`; }); list += `file '${frames.at(-1).file.split("/").pop()}'\n`; writeFileSync(`tmp/film/capm/${name}/list.txt`, list); execFileSync("/opt/homebrew/bin/ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", `tmp/film/capm/${name}/list.txt`, "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:0:color=f7f5f3,fps=60,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "12", `tmp/film/${name}.mp4`]); writeFileSync(`tmp/film/${name}.marks.json`, JSON.stringify(marks)); console.log("encoded", name); }
execFileSync("tar", ["-cf", "tmp/film/film-pack2.tar", "-C", "tmp/film", "data", ...["m-home","m-explore","m-record","m-foryou"].flatMap((n) => [`${n}.mp4`, `${n}.marks.json`])]);
console.log("PACKED");
