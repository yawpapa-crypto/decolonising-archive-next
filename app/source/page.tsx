import EntityIndexPage from "@/src/components/kgo/EntityIndexPage";

export const metadata = {
  title: "Sources | ARED",
  description: "Browse institutions, archives and source pathways supplying ARED records.",
  alternates: { canonical: "/source" },
};

export default function SourceIndexRoute() {
  return <EntityIndexPage kind="source" />;
}
