"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Company } from "@/company/types";
import { useUserSession } from "@/lib/use-user-session";

const CompanyContext = createContext<Company | undefined | null>(null);

export const CompanyProvider = ({
  company,
  children,
}: {
  company?: Company;
  children: ReactNode;
}) => {
  return (
    <CompanyContext.Provider value={company}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): Company => {
  const company = useContext(CompanyContext);
  if (company === null) {
    throw new Error("useCompany mut be used withing CompanyProvider");
  }

  if (company === undefined) {
    throw new Error("Company is not logged");
  }

  return company;
};
