const qs = ["Asante", "Ghana textile", "Yoruba", "Benin bronze", "adinkra"];
for (const q of qs) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q + " filetype:bitmap")}&gsrlimit=20&prop=imageinfo&iiprop=extmetadata&format=json`;
  const d = await fetch(u, { headers: { "User-Agent": "ARED/1.0 (https://ared.design)" } }).then((r) => r.json()).catch((e) => ({ err: String(e) }));
  if (d.err) { console.log(q, d.err); continue; }
  for (const p of Object.values(d.query?.pages ?? {})) {
    const m = p.imageinfo?.[0]?.extmetadata ?? {}; const g = (k) => String(m[k]?.value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 36);
    console.log(q, "|", g("DateTimeOriginal"), "|", g("ObjectName"), "|", p.title.slice(5, 60));
  }
}
console.log("DONE");
