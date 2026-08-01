import EntityIndexPage from "@/src/components/kgo/EntityIndexPage";

export const metadata = {
  title: "Regions | ARED",
  description: "Browse regions used to situate ARED records across Africa, the diaspora and the Global South.",
  alternates: { canonical: "/region" },
};

export default function RegionIndexRoute() {
  return <EntityIndexPage kind="region" />;
}
