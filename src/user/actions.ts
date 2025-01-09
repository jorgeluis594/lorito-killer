"use server";

import registerUser from "@/user/use-cases/createUser";
import * as repository from "@/user/db_repository";
import { response } from "@/lib/types";
import { User } from "@/user/types";
import { getSession } from "@/lib/auth";
import bcrypt from "bcrypt";

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

export const changePassword = async (
  password: string,
  newPassword: string,
): Promise<response<User>> => {
  const { user } = await getSession();
  if (!user) {
    return { success: false, message: "Usuario no autenticado" };
  }

  const foundResponse = await repository.getUserByEmail(user.email);
  if (!foundResponse.success) {
    return { success: false, message: "Usuario no enontrado" };
  }

  const equal = await bcrypt.compare(password, foundResponse.data.password);
  if (!equal) {
    return { success: false, message: "Contraseña incorrecta" };
  }

  return await repository.updatePassword(
    user.id,
    await bcrypt.hash(newPassword, 10),
  );
};
