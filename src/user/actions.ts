"use server";

import registerUser from "@/user/use-cases/createUser";
import * as repository from "@/user/db_repository";
import { response } from "@/lib/types";
import { User } from "@/user/types";

export const createUser = async (
  companyId: string,
  email: string,
  password: string,
): Promise<response<User>> => {
  const createdUserResponse = await registerUser(repository, {
    companyId,
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

export const updateUser = async (user: User): Promise<response<User>> => {
  return await repository.updateUser(user);
};
