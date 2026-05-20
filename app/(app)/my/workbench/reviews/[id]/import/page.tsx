import ReviewImportClient from "../../components/ReviewImportClient";
import { loadWorkbenchReviewSnapshot } from "@/lib/workbench-review-module";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewImportPage({ params }: PageProps) {
  const { id } = await params;
  const snapshot = await loadWorkbenchReviewSnapshot(id);
  return <ReviewImportClient snapshot={snapshot} />;
}
