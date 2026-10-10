"use client";
import { useFormStatus } from "react-dom";

/** Actual action pending state resets on completion, including an unsuccessful response. */
export default function AuthSubmit({ children, pendingLabel, disabled = false }: {
  children: React.ReactNode;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return <button className="signup-next" disabled={pending || disabled} aria-busy={pending}>
    {pending && <span className="auth-progress-mark" aria-hidden="true" />}
    <span role="status" aria-live="polite">{pending ? pendingLabel : children}</span>
  </button>;
}
