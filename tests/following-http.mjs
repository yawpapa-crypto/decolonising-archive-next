const base = "http://localhost:3000";
for (const [path, options, expected] of [
  ["/api/following", {}, 200],
  [
    "/api/following",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "10000000-0000-0000-0000-000000000001",
        kind: "profile",
        follow: true,
      }),
    },
    401,
  ],
  [
    "/api/following",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://untrusted.invalid",
      },
      body: "{}",
    },
    403,
  ],
  [
    "/api/following",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
    400,
  ],
  ["/people/10000000-0000-0000-0000-000000000001", {}, 404],
  ["/curated-collections/20000000-0000-0000-0000-000000000001", {}, 404],
]) {
  const response = await fetch(base + path, options);
  if (response.status !== expected)
    throw new Error(path + ": " + response.status + " != " + expected);
  console.log("PASS", path, response.status);
}
