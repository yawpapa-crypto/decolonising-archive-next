"use client";

import type { PipelineStage } from "@/lib/workbench-intelligence-pipeline";

type Props = {
  stages: PipelineStage[];
  embedded?: boolean;
};

export default function IntelligencePipeline({ stages, embedded }: Props) {
  const body = (
    <div className="ri-pipeline-stepper" role="list">
      {stages.map((stage, index) => (
        <div key={stage.id} className="ri-pipeline-step" role="listitem">
          <div className="ri-pipeline-step__marker" style={{ backgroundColor: stage.color }}>
            {stage.count}
          </div>
          <div className="ri-pipeline-step__copy">
            <strong>{stage.label}</strong>
            <span>{stage.description}</span>
          </div>
          {index < stages.length - 1 ? <div className="ri-pipeline-step__line" aria-hidden /> : null}
        </div>
      ))}
    </div>
  );

  if (embedded) return <div role="tabpanel">{body}</div>;

  return (
    <section className="ri-panel ri-dash-pipeline" aria-label="Systematic literature review pipeline">
      <div className="ri-dash-pipeline__head">
        <h3 className="ri-section-title">SLR pipeline</h3>
        <p>Identification → Screening → Eligibility → Included → Synthesis</p>
      </div>
      {body}
    </section>
  );
}
