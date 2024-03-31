import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth-config";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail } from "@/user/db_repository";
import CreateUserSchema from "@/user/schemas/create-user-schema";
import bcrypt from "bcrypt";
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = CreateUserSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;
        const userResponse = await getUserByEmail(email);
        if (!userResponse.success) return null;
        const isValidPassword = await bcrypt.compare(
          password,
          userResponse.data.password,
        );
        if (!isValidPassword) return null;

        return userResponse.data;
      },
    }),
  ],
});
