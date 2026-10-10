"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type Scope = "both" | "local" | "global";

const SCOPES: Array<{ id: Scope; label: string; line: string }> = [
  { id: "both", label: "Both", line: "Ghana's archive beside the museums that hold its echoes." },
  { id: "local", label: "Local", line: "Records held and described in the Decolonising Archive." },
  { id: "global", label: "Global", line: "Open-access collections from Chicago, Washington and Europe." },
];

const Ctx = createContext<{ scope: Scope; setScope: (s: Scope) => void }>({ scope: "both", setScope: () => {} });

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState<Scope>("both");
  const value = useMemo(() => ({ scope, setScope }), [scope]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useScope = () => useContext(Ctx);

/** Both / Local / Global, as quiet text buttons. */
export function ScopeToggle() {
  const { scope, setScope } = useScope();
  const active = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];
  return (
    <>
      <div className="ared-scope" role="radiogroup" aria-label="Show images from">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={scope === s.id}
            className="ared-scope__btn"
            onClick={() => setScope(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="ared-sr" aria-live="polite">{active.line}</p>
    </>
  );
}
