import EntityIndexPage from "@/src/components/kgo/EntityIndexPage";

export const metadata = {
  title: "Languages | ARED",
  description: "Browse languages represented in ARED records and knowledge systems.",
  alternates: { canonical: "/language" },
};

export default function LanguageIndexRoute() {
  return <EntityIndexPage kind="language" />;
}
