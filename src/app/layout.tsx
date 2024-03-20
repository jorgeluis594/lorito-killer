import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import type { Metadata } from "next";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import "./globals.css";
import { Inter as FontSans } from "next/font/google";

import { cn } from "@/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tu aplicación de tiendas",
  description: "Hola",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Header />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="w-full pt-16">
            <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
