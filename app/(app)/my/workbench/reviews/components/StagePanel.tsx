import Link from "next/link";

export default function StagePanel({
  title,
  detail,
  stats,
  href,
  actionLabel,
}: {
  title: string;
  detail: string;
  stats: Array<{ label: string; value: number; highlight?: boolean }>;
  href: string;
  actionLabel: string;
}) {
  return (
    <article className="workbench-review-stage-panel">
      <header className="workbench-review-stage-panel-head">
        <div>
          <h2>{title}</h2>
          <p>{detail}</p>
        </div>
        <Link href={href} className="workbench-review-primary workbench-review-stage-cta">
          {actionLabel}
        </Link>
      </header>
      <div className="workbench-review-metrics workbench-review-stage-metrics">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`workbench-review-stage-card${stat.highlight ? " is-highlight" : ""}`}
          >
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
