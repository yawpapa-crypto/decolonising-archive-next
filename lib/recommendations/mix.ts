/** Configurable experiment, shared by every recommendation consumer. */
export function discoveryMix(raw?: string) {
  const fallback = { relevant: 0.6, adjacent: 0.25, serendipity: 0.15 };
  if (!raw) return fallback;
  const values = raw.split(",").map(Number);
  if (values.length !== 3 || values.some(v => !Number.isFinite(v) || v <= 0)) return fallback;
  const sum = values.reduce((a, b) => a + b, 0);
  return { relevant: values[0] / sum, adjacent: values[1] / sum, serendipity: values[2] / sum };
}
