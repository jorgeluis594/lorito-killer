import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";

type Session = {
  user: { name: string; email: string };
  name: string;
  email: string;
  sub: string;
  userId: string;
  iat: number;
  exp: number;
  jti: string;
};

export const getSession = async (): Promise<Session> => {
  return (await getServerSession(authConfig)) as Session;
};