"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { updateReviewProject } from "@/lib/workbench-review-actions";
import type { WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";
import type { ReviewProjectType } from "@/lib/workbench-intelligence-types";
import ReviewCollaboratorsSection from "./ReviewCollaboratorsSection";
import ReviewProjectShell from "./ReviewProjectShell";
import { QUESTION_TYPES, RESEARCH_AREAS, REVIEW_PURPOSES, REVIEW_TYPES, resultMessage } from "./review-shared";

export default function ReviewSettingsClient({ snapshot }: { snapshot: WorkbenchReviewSnapshot }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const project = snapshot.activeProject;
  if (!project) return null;
  const projectId = project.id;
  const defaultReviewType = project.reviewType;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateReviewProject(projectId, {
        title: String(form.get("title") ?? ""),
        reviewType: String(form.get("reviewType") ?? defaultReviewType) as ReviewProjectType,
        questionType: String(form.get("questionType") ?? ""),
        areaOfResearch: String(form.get("areaOfResearch") ?? ""),
        purposeOfReview: String(form.get("purposeOfReview") ?? ""),
        researchQuestion: String(form.get("researchQuestion") ?? ""),
        inclusionCriteria: String(form.get("inclusionCriteria") ?? ""),
        exclusionCriteria: String(form.get("exclusionCriteria") ?? ""),
      });
      setMessage(resultMessage(result, "Review updated."));
      router.refresh();
    });
  }

  return (
    <ReviewProjectShell project={project} snapshot={snapshot} activeSegment="summary">
      <section className="workbench-review-create workbench-review-page">
        {message ? <p className="workbench-review-flash">{message}</p> : null}
        <form className="workbench-review-card workbench-review-form" onSubmit={handleSubmit}>
          <label>
            <span>Review name</span>
            <input name="title" required defaultValue={project.title} />
          </label>
          <label>
            <span>Review type</span>
            <select name="reviewType" defaultValue={project.reviewType}>
              {REVIEW_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Question type</span>
            <select name="questionType" defaultValue={project.questionType ?? ""}>
              {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.label}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Area of research</span>
            <select name="areaOfResearch" defaultValue={project.areaOfResearch ?? ""}>
              {RESEARCH_AREAS.map((area) => (
                <option key={area.value} value={area.label}>
                  {area.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Purpose of review</span>
            <select name="purposeOfReview" defaultValue={project.purposeOfReview ?? ""}>
              {REVIEW_PURPOSES.map((purpose) => (
                <option key={purpose.value} value={purpose.label}>
                  {purpose.label}
                </option>
              ))}
            </select>
          </label>
          <label className="is-wide">
            <span>Research question</span>
            <textarea name="researchQuestion" rows={3} defaultValue={project.researchQuestion ?? ""} />
          </label>
          <label className="is-wide">
            <span>Inclusion criteria</span>
            <textarea name="inclusionCriteria" rows={3} defaultValue={project.inclusionCriteria ?? ""} />
          </label>
          <label className="is-wide">
            <span>Exclusion criteria</span>
            <textarea name="exclusionCriteria" rows={3} defaultValue={project.exclusionCriteria ?? ""} />
          </label>
          <div className="workbench-review-form-actions">
            <button className="workbench-review-primary" type="submit" disabled={isPending}>
              Save changes
            </button>
            <Link href={`/my/workbench/reviews/${project.id}`} className="workbench-review-ghost">
              Back to summary
            </Link>
          </div>
        </form>

        <ReviewCollaboratorsSection snapshot={snapshot} />
      </section>
    </ReviewProjectShell>
  );
}
