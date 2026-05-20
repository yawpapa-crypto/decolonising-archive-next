"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createReviewProject } from "@/lib/workbench-review-actions";
import type { ReviewProjectType } from "@/lib/workbench-intelligence-types";
import ReviewPageHeader from "./ReviewPageHeader";
import {
  QUESTION_TYPES,
  RESEARCH_AREAS,
  REVIEW_PURPOSES,
  REVIEW_TYPES,
} from "./review-shared";

export default function ReviewCreateClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createReviewProject({
        title: String(form.get("title") ?? ""),
        reviewType: String(form.get("reviewType") ?? "systematic_review") as ReviewProjectType,
        questionType: String(form.get("questionType") ?? ""),
        areaOfResearch: String(form.get("areaOfResearch") ?? ""),
        purposeOfReview: String(form.get("purposeOfReview") ?? ""),
        researchQuestion: String(form.get("researchQuestion") ?? ""),
        inclusionCriteria: String(form.get("inclusionCriteria") ?? ""),
        exclusionCriteria: String(form.get("exclusionCriteria") ?? ""),
      });
      if (result.ok) {
        router.push(`/my/workbench/reviews/${result.projectId}`);
      } else {
        setMessage(result.error ?? "Review could not be created.");
      }
    });
  }

  return (
    <section className="workbench-review-create workbench-review-page">
      <ReviewPageHeader
        backHref="/my/workbench/reviews"
        backLabel="All reviews"
        eyebrow="Setup"
        title="Start a new review"
        description="Define the protocol before importing references."
      />

      {message ? (
        <p className="workbench-review-flash is-error" role="alert">
          {message}
        </p>
      ) : null}

      <form className="workbench-review-card workbench-review-form workbench-review-create-form" onSubmit={handleSubmit}>
        <fieldset className="workbench-review-fieldset">
          <legend>Review details</legend>
          <div className="workbench-review-form-grid">
            <label className="is-wide">
              <span>Review name</span>
              <input name="title" required placeholder="Working title" autoComplete="off" />
            </label>
            <label>
              <span>Review type</span>
              <select name="reviewType" defaultValue="systematic_review">
                {REVIEW_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Question type</span>
              <select name="questionType" defaultValue="pcc">
                {QUESTION_TYPES.map((type) => (
                  <option key={type.value} value={type.label}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Area of research</span>
              <select name="areaOfResearch" defaultValue="decolonial_design">
                {RESEARCH_AREAS.map((area) => (
                  <option key={area.value} value={area.label}>
                    {area.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Purpose</span>
              <select name="purposeOfReview" defaultValue="publication">
                {REVIEW_PURPOSES.map((purpose) => (
                  <option key={purpose.value} value={purpose.label}>
                    {purpose.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="workbench-review-fieldset">
          <legend>Protocol</legend>
          <div className="workbench-review-form-grid">
            <label className="is-wide">
              <span>Research question</span>
              <textarea name="researchQuestion" rows={3} placeholder="What should this review answer?" />
            </label>
            <label className="is-wide">
              <span>Inclusion criteria</span>
              <textarea name="inclusionCriteria" rows={3} placeholder="What should be included?" />
            </label>
            <label className="is-wide">
              <span>Exclusion criteria</span>
              <textarea name="exclusionCriteria" rows={3} placeholder="What should be excluded?" />
            </label>
          </div>
        </fieldset>

        <div className="workbench-review-form-actions">
          <button className="workbench-review-primary" type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create review"}
          </button>
          <Link href="/my/workbench/reviews" className="workbench-review-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
