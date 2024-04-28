"use client";

import { useSession } from "next-auth/react";
import { User } from "@/user/types";

export const useUserSession = (): User | null => {
  const { data: session } = useSession();
  if (!session) return null;

  return session.user as User;
};
