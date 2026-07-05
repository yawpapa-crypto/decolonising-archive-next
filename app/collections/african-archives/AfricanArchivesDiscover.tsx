"use client";

import FederatedLiveDiscover from "@/components/collections/FederatedLiveDiscover";

export default function AfricanArchivesDiscover() {
  return (
    <FederatedLiveDiscover
      variant="african"
      defaultQuery="Africa"
      searchPlaceholder="Search Africa, oral history, textiles, photography…"
      heading="Discover across sources"
      description="Live federated search via the same API routes as the main library — Archive, OpenAlex, Wikidata, Library of Congress, Smithsonian, open access, catalogues, and AODL. Results open on partner sites."
      collectionSlug="african-archives"
      extraSourceIds={["aodl"]}
    />
  );
}
