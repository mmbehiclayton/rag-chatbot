import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({ 
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'], 
  variable: '--font-sans' 
});

export const metadata: Metadata = {
  title: "Elimu | Empowering Every Educator",
  description: "AI-powered education platform tailored for the KICD CBC curriculum.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" suppressHydrationWarning>
        <body className={`${poppins.variable} font-sans antialiased min-h-[100dvh] flex flex-col selection:bg-primary/30 selection:text-primary-foreground relative`}>
          <div className="fixed inset-0 z-[-1] pointer-events-none bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(0,0,0,0))]" />
          <main className="flex-1 flex flex-col items-center">
            {children}
          </main>
          <Toaster position="top-right" richColors theme="system" />
        </body>
      </html>
  );
}
