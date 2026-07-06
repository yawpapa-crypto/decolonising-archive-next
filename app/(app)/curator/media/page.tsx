import PageShell from "@/src/components/layout/PageShell";
import { createClient } from "@/src/lib/supabase/server";
import CuratorMediaUploadForm from "./CuratorMediaUploadForm";
import CuratorMediaLibrary from "./CuratorMediaLibrary";

export default async function CuratorMediaPage() {
  const supabase = await createClient();

  const { data: mediaItems } = await supabase
    .from("media_library")
    .select("*, media_links (*)")
    .order("created_at", { ascending: false });

  return (
    <PageShell>
      <div className="dashboard-canvas-outer dashboard-shell--curator">
        <main className="workspace-page curator-workspace dashboard-canvas">
          <header className="workspace-page-header dashboard-header">
            <div className="workspace-page-header-top">
              <div className="workspace-page-title-block">
                <p className="workspace-eyebrow">Curator tools</p>
                <h1>Media library</h1>
                <p className="workspace-page-intro">
                  Upload and manage media for dossiers, featured records, pathways,
                  archive notes, and homepage storytelling.
                </p>
              </div>
              <div className="workspace-header-pill-row">
                <a href="/curator" className="workspace-link">
                  Curator workspace
                </a>
              </div>
            </div>
          </header>

          <section className="curator-media-layout">
            <CuratorMediaUploadForm />
            <CuratorMediaLibrary mediaItems={mediaItems ?? []} />
          </section>
        </main>
      </div>
    </PageShell>
  );
}
