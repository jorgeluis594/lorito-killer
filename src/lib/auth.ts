import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import type { UserRole } from "@/authorization/types";

type Session = {
  user:
    | {
        name: string;
        email: string;
        id: string;
        companyId: string;
        role: UserRole;
        active: boolean;
      }
    | undefined;
  name: string;
  email: string;
  sub: string;
  iat: number;
  exp: number;
  jti: string;
};

export const getSession = async (): Promise<Session> => {
  return (await getServerSession(authConfig)) as Session;
};
