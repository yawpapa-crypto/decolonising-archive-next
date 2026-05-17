import { loadWorkbenchIntelligenceSnapshot } from "@/lib/workbench-intelligence";
import WorkbenchIntelligenceClient from "./WorkbenchIntelligenceClient";

export default async function WorkbenchIntelligencePage() {
  const snapshot = await loadWorkbenchIntelligenceSnapshot();

  return <WorkbenchIntelligenceClient snapshot={snapshot} />;
}
