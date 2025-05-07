"use client";

import { getCompany } from "@/order/actions";
import { signOut as nextAuthSignOut } from "next-auth/react";

export default function useSignOut() {
  return async () => {
    const [companyResponse] = await Promise.all([
      getCompany(),
      nextAuthSignOut({ redirect: false }),
    ]);

    if (!companyResponse.success) {
      return;
    }

    window.location.href =
      process.env.NODE_ENV == "production"
        ? `https://kogoz.net/login`
        : `http://${window.location.host}/login`;
  };
}
