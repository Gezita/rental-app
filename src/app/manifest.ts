import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lessora",
    short_name: "Lessora",
    description: "Landlord billing and document management",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8f7f2",
    theme_color: "#c46b41",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/brand/lessora-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/lessora-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
