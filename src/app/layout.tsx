import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/shared/install-app";
import { Toaster } from "@/components/ui/sonner";
import { siteUrl } from "@/lib/site-url";

// One variable font file covers every weight, which keeps the first load small on mobile data.
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Elimu | Schemes of work and lesson plans for Kenyan teachers",
  description:
    "Schemes of work, lesson plans and lesson notes for your classes, based on the KICD curriculum designs. Ready in minutes, on your phone.",
  applicationName: "Elimu",
  appleWebApp: { capable: true, title: "Elimu", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
  // Google Search Console's HTML tag check, so the site can be verified without a custom domain.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#0d72ef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} font-sans antialiased min-h-[100dvh] flex flex-col bg-background text-foreground`}
      >
        <main className="flex-1 flex flex-col">{children}</main>
        <Toaster position="top-center" richColors />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
