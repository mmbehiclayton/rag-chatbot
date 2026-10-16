import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Elimu | Empowering Every Educator",
  description: "Create KICD-aligned schemes of work, lesson plans and assessments in minutes.",
};

export const viewport: Viewport = {
  themeColor: "#1e8449",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} font-sans antialiased min-h-[100dvh] flex flex-col bg-background text-foreground`}>
        <main className="flex-1 flex flex-col">{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
