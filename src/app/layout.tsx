import type { Metadata } from "next";
import "./globals.css";
import { Inter as FontSans } from "next/font/google";
import { Toaster } from "@/shared/components/ui/toaster";
import { getServerSession } from "next-auth";
import Providers from "@/shared/components/layout/providers";

import { cn } from "@/lib/utils";
import { authConfig } from "@/lib/auth-config";
import { getCompany } from "@/company/db_repository";
import { Company } from "@/company/types";
import { getSession } from "@/lib/auth";
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Tu aplicación de tiendas",
  description: "Hola",
};

const fetchCompany = async (): Promise<Company | undefined> => {
  const session = await getSession();
  if (!session) return;

  const companyResponse = await getCompany(session.user.companyId);
  if (!companyResponse.success) {
    throw new Error("User doesn't have a company");
  }

  return companyResponse.data;
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, company] = await Promise.all([
    getServerSession(authConfig),
    fetchCompany(),
  ]);

  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers session={session} company={company}>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
