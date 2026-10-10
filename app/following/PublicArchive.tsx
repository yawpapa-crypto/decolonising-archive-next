"use client";
import Masonry from "@/app/home-next/for-you/Masonry";
import type { DiscoverItem } from "@/lib/home/discover-shared";
import RecordSurface from "./RecordSurface";
export default function PublicArchive({ items, tile = 170, gap = 6 }: { items: DiscoverItem[]; tile?: number; gap?: number }) {
  return (
    <RecordSurface>
      {(render) => <Masonry items={items} tile={tile} gap={gap} render={(item) => render(item)} />}
    </RecordSurface>
  );
}
