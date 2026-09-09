import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/shared/components/ui/toaster";
import { getServerSession } from "next-auth";
import Providers from "@/shared/components/layout/providers";
import { SpeedInsights } from '@vercel/speed-insights/next';

import { authConfig } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "Tu aplicación de tiendas",
  description: "Hola",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authConfig)

  return (
    <html lang="es">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers session={session}>
          {children}
        </Providers>
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
