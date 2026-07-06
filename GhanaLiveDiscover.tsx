"use client";

import FederatedLiveDiscover from "@/components/collections/FederatedLiveDiscover";
import { ghanaQueryForSource } from "@/lib/discovery/federated-discover";

export default function GhanaLiveDiscover() {
  return (
    <FederatedLiveDiscover
      variant="ghana"
      defaultQuery="ghana graphic design"
      searchPlaceholder="Search across all sources…"
      heading="Search connected sources"
      description="Same live federation as the main library — Archive, OpenAlex, Wikidata, Library of Congress, Smithsonian, open access, catalogues (Wikimedia, Open Library, The Met), and more. Use + Suggest to nominate items for the collection."
      queryForSource={ghanaQueryForSource}
      enableSuggest
    />
  );
}
