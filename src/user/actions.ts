"use server";

import registerUser from "@/user/use-cases/createUser";
import * as repository from "@/user/db_repository";
import { response } from "@/lib/types";
import { User } from "@/user/types";
import { getSession } from "@/lib/auth";
import bcrypt from "bcrypt";
import { protectedAction } from "@/authorization/server";
import type { UserRole } from "@/authorization/types";

export const createUser = protectedAction(
  { roles: ["ADMIN"] },
  async (
    user,
    companyId: string,
    email: string,
    password: string,
    role: UserRole = "CASHIER",
  ): Promise<response<User>> => {
    const createdUserResponse = await registerUser(repository, {
      companyId: user.companyId,
      email,
      password,
      role,
    });

    if (!createdUserResponse.success) {
      return { success: false, message: createdUserResponse.message };
    }

    return createdUserResponse;
  },
);

export const updateUser = protectedAction(
  { roles: ["ADMIN"] },
  async (_user, userToUpdate: User): Promise<response<User>> => {
    return await repository.updateUser(userToUpdate);
  },
);

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
