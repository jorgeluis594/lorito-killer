"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function useUpdateQueryString(): (
  params: Record<string, string | number | null>,
) => void {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathName = usePathname();

  const createQueryString = useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams?.toString());

      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }
      }

      return newSearchParams.toString();
    },
    [searchParams],
  );

  return (params: Record<string, string | number | null>) => {
    router.push(`${pathName}?${createQueryString(params)}`, {
      scroll: false,
    });
  };
}
