"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = Omit<
  ComponentProps<"button">,
  "type" | "children"
> & {
  children: React.ReactNode;
  pendingLabel: string;
};

/**
 * Submit control for server-action forms: disables while pending and swaps label.
 * Must be rendered inside a <form> (uses useFormStatus).
 */
export default function PendingSubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...rest
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const busy = pending || disabled;
  return (
    <button
      {...rest}
      type="submit"
      className={["pending-submit-button", className].filter(Boolean).join(" ")}
      disabled={!!busy}
      aria-busy={pending ? true : undefined}
      data-pending={pending ? "true" : undefined}
    >
      {pending ? (
        <span className="pending-submit-button__row">
          <span className="pending-submit-button__spinner" aria-hidden />
          <span>{pendingLabel}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
