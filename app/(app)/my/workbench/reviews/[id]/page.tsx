import ReviewSummaryClient from "../components/ReviewSummaryClient";
import { loadWorkbenchReviewSnapshot } from "@/lib/workbench-review-module";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewSummaryPage({ params }: PageProps) {
  const { id } = await params;
  const snapshot = await loadWorkbenchReviewSnapshot(id);
  return <ReviewSummaryClient snapshot={snapshot} />;
}
