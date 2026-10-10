// Fonts (ARED's Fraunces + Inter, OFL), encode captures, and pack everything the compositor needs.
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
mkdirSync("tmp/film/fonts", { recursive: true });
for (const [name, url] of [["Fraunces.ttf", "https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf"], ["Inter.ttf", "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf"]]) {
  const r = await fetch(url); writeFileSync(`tmp/film/fonts/${name}`, Buffer.from(await r.arrayBuffer())); console.log(name, r.status);
}
copyFileSync("public/images/ared-logo.png", "tmp/film/ared-logo.png");
await import("./encode.mjs");
execFileSync("tar", ["-cf", "tmp/film/film-pack.tar", "-C", "tmp/film", "fonts", "ared-logo.png", ...["home", "search", "record", "localglobal", "foryou", "following"].flatMap((n) => [`${n}.mp4`, `${n}.marks.json`])]);
console.log("packed");
