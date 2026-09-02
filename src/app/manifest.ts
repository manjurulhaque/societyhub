import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SARWS Connect | Society Portal",
    short_name: "SARWS Connect",
    description:
      "Official resident and community management platform for Syndicate Arena Residents' Welfare Society (SARWS).",
    start_url: "/",
    id: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0c0a09",
    orientation: "portrait-primary",
    scope: "/",
    lang: "en",
    dir: "ltr",
    categories: ["productivity", "utilities", "business", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Society Portal",
        short_name: "Society",
        url: "/society",
        description: "Access society dashboard, flats, bills, and amenities",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Admin Panel",
        short_name: "Admin",
        url: "/admin/dashboard",
        description: "Super Admin control panel",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "My Profile",
        short_name: "Profile",
        url: "/profile",
        description: "View account and security credentials",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  }
}
