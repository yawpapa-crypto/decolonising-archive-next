"use client";

import FilmPreview from "../FilmPreview";

/** Field and Research films: the same autoplaying, muted, looping player as the homepage film. */
export default function Film({ research = false }: { research?: boolean }) {
  return <figure className="fn-film">
    <FilmPreview
      className="ared-ft--stage"
      src={research ? "/videos/ared-research-launch.mp4" : "/videos/ared-field-launch.mp4"}
      poster={research ? "/images/ared-research-poster.jpg" : "/images/ared-field-poster.jpg"}
      label={research ? "ARED Research launch film" : "ARED Field launch film"}
    />
    <figcaption className="fn-film-foot"><span>{research ? "ARED Research · Connect your fieldwork, notes, and sources." : "ARED Field · Discover, explore, and save your next find."}</span></figcaption>
  </figure>;
}
