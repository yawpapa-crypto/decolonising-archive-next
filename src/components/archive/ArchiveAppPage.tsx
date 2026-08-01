import PageShell from "@/src/components/layout/PageShell";
import Script from "next/script";

type ArchiveAppPageProps = {
  /** Server-resolved sign-in state for Library advanced search gating. */
  initialMemberSignedIn?: boolean;
};

export default function ArchiveAppPage({ initialMemberSignedIn }: ArchiveAppPageProps = {}) {
  const memberSignedInAttr =
    initialMemberSignedIn === undefined ? undefined : initialMemberSignedIn ? "true" : "false";

  return (
    <PageShell>
      <link
        rel="stylesheet"
        href="/assets/css/record-detail-editorial.css?v=20260802-kgo-v2"
      />
      <main
        id="app"
        {...(memberSignedInAttr !== undefined
          ? { "data-member-signed-in": memberSignedInAttr }
          : {})}
      />

      <noscript>
        <div className="empty noscript-note">
          This archive needs JavaScript enabled to render the local index and
          record pages.
        </div>
      </noscript>

      <Script
        id="archive-app-script"
        src="/assets/js/app.js?v=20260802-kgo-v2"
        strategy="afterInteractive"
      />
    </PageShell>
  );
}
