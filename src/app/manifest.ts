import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Keuangan Kontrakan",
    short_name: "Kontrakan",
    description: "Pencatatan dan pembagian biaya kontrakan",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icons/image-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}