import type { Metadata } from "next";
import "./globals.css";
import { Inter as FontSans } from "next/font/google";
import { Toaster } from "@/shared/components/ui/toaster";
import { getSession } from "@/lib/auth";
import Providers from "@/shared/components/layout/providers";

import { cn } from "@/lib/utils";
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tu aplicación de tiendas",
  description: "Hola",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers session={session as any}>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
