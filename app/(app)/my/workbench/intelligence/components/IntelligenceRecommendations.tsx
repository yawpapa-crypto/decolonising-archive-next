"use client";

import { AlertTriangle, Info, Sparkles } from "lucide-react";
import type { IntelligenceRecommendation } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  recommendations: IntelligenceRecommendation[];
};

export default function IntelligenceRecommendations({ recommendations }: Props) {
  if (!recommendations.length) {
    return (
      <section className="ri-panel ri-recommendations" aria-label="Recommendations">
        <h3 className="ri-section-title">Gaps & recommendations</h3>
        <p className="ri-empty-note">No recommendations yet. Save records and citations to unlock guidance.</p>
      </section>
    );
  }

  return (
    <section className="ri-panel ri-recommendations" aria-label="Recommendations">
      <h3 className="ri-section-title">Gaps & recommendations</h3>
      <ul className="ri-recommendations__list">
        {recommendations.map((item) => (
          <li key={item.id} className={cn("ri-recommendation", `is-${item.severity}`)}>
            <span className="ri-recommendation__icon" aria-hidden>
              {item.severity === "info" ? <Info size={16} /> : <AlertTriangle size={16} />}
            </span>
            <div>
              <div className="ri-recommendation__head">
                <strong>{item.title}</strong>
                <span className="ri-recommendation__category">{item.category}</span>
              </div>
              <p>{item.detail}</p>
            </div>
            <Sparkles size={14} className="ri-recommendation__spark" aria-hidden />
          </li>
        ))}
      </ul>
    </section>
  );
}
