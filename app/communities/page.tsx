import EntityIndexPage from "@/src/components/kgo/EntityIndexPage";

export const metadata = {
  title: "Communities | ARED",
  description: "Browse communities and cultural groups represented across ARED records.",
  alternates: { canonical: "/communities" },
};

export default function CommunitiesIndexRoute() {
  return <EntityIndexPage kind="community" />;
}
