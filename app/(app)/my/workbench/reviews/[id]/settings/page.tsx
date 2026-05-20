import ReviewSettingsClient from "../../components/ReviewSettingsClient";
import { loadWorkbenchReviewSnapshot } from "@/lib/workbench-review-module";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const snapshot = await loadWorkbenchReviewSnapshot(id);
  return <ReviewSettingsClient snapshot={snapshot} />;
}
