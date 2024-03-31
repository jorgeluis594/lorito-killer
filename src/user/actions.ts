"use server";

import { signIn } from "@/lib/auth";

export const signInWithEmail = (
  email: string,
  password: string,
  redirection = "/",
) => {
  signIn("credentials", {
    email,
    password,
    callbackUrl: redirection,
  });
};
