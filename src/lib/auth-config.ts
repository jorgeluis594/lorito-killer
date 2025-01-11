import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import CreateUserSchema from "@/user/schemas/create-user-schema";
import { getUserByEmail } from "@/user/db_repository";
import bcrypt from "bcrypt";

export const authConfig: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) token.userId = user.id;
      return {
        ...token,
        user: user,
      };
    },
    session: async ({ session, token, user }) => {
      if (!session.user) return session;

      const persistedUser = await getUserByEmail(session.user.email!);
      if (!persistedUser.success) return { ...session, user: undefined };

      return {
        ...session,
        user: {
          ...session.user,
          id: persistedUser.data.id,
          name: persistedUser.data.name,
          email: persistedUser.data.email,
          companyId: persistedUser.data.companyId,
        },
      };
    },
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "ejemplo@gmail.com",
        },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
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

        const { password: _, ...user } = userResponse.data;
        return { ...user, id: user.id! };
      },
    }),
  ],
};
