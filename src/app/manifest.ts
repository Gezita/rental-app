import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "zigglo",
    short_name: "zigglo",
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
        src: "/brand/zigglo-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/zigglo-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
