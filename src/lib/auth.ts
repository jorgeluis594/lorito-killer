import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth-config";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail } from "@/user/db_repository";
import bcrypt from "bcrypt";
import { z } from "zod";

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
        debugger;
        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;
        const userResponse = await getUserByEmail(email);
        if (!userResponse.success) return null;
        const isValidPassword = await bcrypt.compare(
          password,
          userResponse.data.password!,
        );
        if (!isValidPassword) return null;

        return userResponse.data;
      },
    }),
  ],
});
