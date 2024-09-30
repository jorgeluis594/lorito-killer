import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";

type Session = {
  user: { name: string; email: string; id: string; companyId: string };
  name: string;
  email: string;
  sub: string;
  iat: number;
  exp: number;
  jti: string;
};

let session: Session | null;

export const getSession = async (): Promise<Session> => {
  if (!session) {
    session = (await getServerSession(authConfig)) as Session
  }
  return session;
};
