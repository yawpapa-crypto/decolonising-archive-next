"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = Omit<
  ComponentProps<"button">,
  "type" | "children" | "onClick"
> & {
  children: React.ReactNode;
  message: string;
  pendingLabel?: string;
  onClick?: ComponentProps<"button">["onClick"];
};

export default function ConfirmSubmitButton({
  children,
  className,
  message,
  pendingLabel = "Saving…",
  onClick,
  disabled,
  ...rest
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...rest}
      type="submit"
      className={["pending-submit-button", className].filter(Boolean).join(" ")}
      disabled={!!disabled || pending}
      aria-busy={pending ? true : undefined}
      data-pending={pending ? "true" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (pending) {
          event.preventDefault();
          return;
        }
        if (!window.confirm(message)) event.preventDefault();
      }}
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
