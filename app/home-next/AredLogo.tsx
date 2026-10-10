/**
 * The Decolonising Archive symbol. At rest it is a fine line drawing of the glyph; on hover or
 * focus the full mark draws itself in from the base while the outline fades. Transparent PNG,
 * inverted in the dark theme by CSS. Reduced motion swaps instantly.
 */
export default function AredLogo({ size = 28 }: { size?: number }) {
  return (
    <span className="ared-logo-wrap" style={{ width: size, height: size }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/ared-logo.png" alt="" width={size} height={size} className="ared-logo ared-logo--line" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/ared-logo.png" alt="" width={size} height={size} className="ared-logo ared-logo--full" draggable={false} />
    </span>
  );
}
