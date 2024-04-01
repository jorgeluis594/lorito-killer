import type { Metadata } from "next";
import "./globals.css";
import { Inter as FontSans } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { getServerSession } from "next-auth";
import Providers from "@/components/layout/providers";

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
  const session = await getServerSession();

  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers session={session}>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
