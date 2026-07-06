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
      description="Same live federation as the main library — loaded in small batches so your browser stays responsive. Use + Suggest to nominate items; submissions go to the admin dashboard and curatorial email."
      collectionSlug="ghana-graphic-design"
      queryForSource={ghanaQueryForSource}
      enableSuggest
    />
  );
}
