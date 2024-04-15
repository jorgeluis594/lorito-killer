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

      return token;
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
        console.log({ user });
        return { ...user, id: user.id! };
      },
    }),
  ],
};
