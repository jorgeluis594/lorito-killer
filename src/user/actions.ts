"use server";

import registerUser from "@/user/use-cases/createUser";
import * as repository from "@/user/db_repository";
import { response } from "@/lib/types";
import { User } from "@/user/types";

export const createUser = async (
  email: string,
  password: string,
): Promise<response<User>> => {
  const createdUserResponse = await registerUser(repository, {
    email,
    password,
  });

  if (!createdUserResponse.success) {
    return { success: false, message: createdUserResponse.message };
  }

  const user = createdUserResponse.data;
  // signInWithEmail(user.email, password);
  return createdUserResponse;
};
