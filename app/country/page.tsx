import EntityIndexPage from "@/src/components/kgo/EntityIndexPage";

export const metadata = {
  title: "Countries | ARED",
  description: "Browse countries and territories associated with ARED records and knowledge systems.",
  alternates: { canonical: "/country" },
};

export default function CountryIndexRoute() {
  return <EntityIndexPage kind="country" />;
}
