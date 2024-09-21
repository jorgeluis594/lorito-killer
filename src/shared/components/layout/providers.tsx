"use client";

import React from "react";
import { SessionProvider, SessionProviderProps } from "next-auth/react";
import { CompanyProvider } from "@/lib/use-company";
import { Company } from "@/company/types";
export default function Providers({
  session,
  company,
  children,
}: {
  session: SessionProviderProps["session"];
  company?: Company;
  children: React.ReactNode;
}) {
  return (
    <>
      <SessionProvider session={session}>
        <CompanyProvider company={company}>{children}</CompanyProvider>
      </SessionProvider>
    </>
  );
}
