import type { MetadataRoute } from "next";

/**
 * Makes Portle installable: added to a phone's home screen it opens full-screen,
 * straight into the app, with its own icon and no browser bars.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portle",
    short_name: "Portle",
    description: "A private archive for your portfolio, your investment theses, and the friends you trust with them.",
    id: "/home",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfafe",
    theme_color: "#fbfafe",
    categories: ["finance", "education", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
