import ReviewExtractionClient from "../../components/ReviewExtractionClient";
import { loadWorkbenchReviewSnapshot } from "@/lib/workbench-review-module";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewExtractionPage({ params }: PageProps) {
  const { id } = await params;
  const snapshot = await loadWorkbenchReviewSnapshot(id);
  return <ReviewExtractionClient snapshot={snapshot} />;
}
