import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Kontrakan Bersama", description: "Patungan, pembayaran, dan jadwal rumah bersama.", manifest: "/manifest.webmanifest" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" data-theme="light" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('kontrakan-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}` }} /></head><body>{children}</body></html>;
}
