import Link from "next/link";
import type { ReactNode } from "react";

export default function ReviewPageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
}) {
  return (
    <header className="workbench-review-hero">
      {backHref ? (
        <Link href={backHref} className="workbench-review-back">
          {backLabel}
        </Link>
      ) : null}
      <div className="workbench-review-hero-body">
        <div>
          {eyebrow ? <p className="workbench-review-eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {description ? <p className="workbench-review-lead">{description}</p> : null}
        </div>
        {action ? <div className="workbench-review-hero-action">{action}</div> : null}
      </div>
    </header>
  );
}
