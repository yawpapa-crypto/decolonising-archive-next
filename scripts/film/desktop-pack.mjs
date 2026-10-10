process.env.VW = "1920"; process.env.VH = "1080"; process.env.PFX = "d-"; process.env.SHOTS = "record";
await import("./capture.mjs");
await import("./encode.mjs");
const { execFileSync } = await import("node:child_process");
execFileSync("tar", ["-cf", "tmp/film/film-pack7.tar", "-C", "tmp/film", "stitch/d-foryou", ...["d-home", "d-search", "d-record"].flatMap((n) => [`${n}.mp4`, `${n}.marks.json`])]);
console.log("PACKED7");
