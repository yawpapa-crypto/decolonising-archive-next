import type { ButtonHTMLAttributes, ReactNode } from "react";

type ArchiveGuidePromptButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function ArchiveGuidePromptButton({
  children,
  className,
  type = "button",
  ...props
}: ArchiveGuidePromptButtonProps) {
  return (
    <button
      {...props}
      className={["archive-guide-prompt", className].filter(Boolean).join(" ")}
      type={type}
    >
      {children}
    </button>
  );
}
