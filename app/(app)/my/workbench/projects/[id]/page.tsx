import ProjectWorkbenchDetail from "./ProjectWorkbenchDetail";

type SearchParams = Promise<{ updated?: string; error?: string }>;

export default async function WorkbenchProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  return <ProjectWorkbenchDetail projectId={id} searchParams={searchParams} />;
}
