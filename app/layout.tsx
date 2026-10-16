import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeepSheep | Secure AI Computer Control",
  description: "A permission-based bridge between compatible AI clients and computers you choose to connect.",
  applicationName: "MeepSheep",
  icons: { icon: "/favicon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MeepSheep" }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10100f"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
