import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";
import type { UserRole } from "@/authorization/types";

type Session = {
  user?: {
    name: string;
    email: string;
    id: string;
    companyId: string;
    role: UserRole;
    active: boolean;
  };
  name?: string;
  email?: string;
  sub?: string;
  iat?: number;
  exp?: number;
  jti?: string;
};

export const getSession = async (): Promise<Session> => {
  const session = await getServerSession(authConfig);

  return (session ?? { user: undefined }) as Session;
};
