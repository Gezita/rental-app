import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rentals Dashboard",
    template: "%s | Rentals Dashboard",
  },
  description: "Landlord billing and document management",
  applicationName: "Rentals Dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rentals",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4ed8" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="min-h-screen antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
