import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Decolonising Archive",
    short_name: "ARED",
    description: "Search, cite and connect decolonising knowledge across Africa, the diaspora and the Global South.",
    start_url: "/explore",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5f3",
    theme_color: "#f7f5f3",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
