import type { MetadataRoute } from "next";

/** Lets teachers install Elimu on their phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Elimu for Teachers",
    short_name: "Elimu",
    description:
      "Schemes of work, lesson plans and lesson notes for your classes, on your phone.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0d72ef",
    lang: "en-KE",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // The logo sits well inside the safe zone, so Android can crop it to any shape.
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "New lesson plan", url: "/dashboard/create/lesson" },
      { name: "New scheme of work", url: "/dashboard/create/scheme" },
      { name: "Staffroom", url: "/dashboard/staffroom" },
    ],
  };
}
