import ReviewScreeningClient from "../../components/ReviewScreeningClient";
import { loadWorkbenchReviewSnapshot } from "@/lib/workbench-review-module";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewScreeningPage({ params }: PageProps) {
  const { id } = await params;
  const snapshot = await loadWorkbenchReviewSnapshot(id);
  return <ReviewScreeningClient snapshot={snapshot} />;
}
