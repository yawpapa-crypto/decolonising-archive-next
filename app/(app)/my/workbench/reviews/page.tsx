import ReviewListClient from "./components/ReviewListClient";
import { loadWorkbenchReviewSnapshot } from "@/lib/workbench-review-module";

export default async function WorkbenchReviewsPage() {
  const snapshot = await loadWorkbenchReviewSnapshot();
  return <ReviewListClient snapshot={snapshot} />;
}
