type JsonLdProps = {
  data: unknown;
};

const JSON_LD_ESCAPE_LOOKUP: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export function serializeJsonLd(data: JsonLdProps["data"]) {
  return (JSON.stringify(data) ?? "null").replace(
    /[<>&\u2028\u2029]/g,
    (char) => JSON_LD_ESCAPE_LOOKUP[char] ?? char,
  );
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
