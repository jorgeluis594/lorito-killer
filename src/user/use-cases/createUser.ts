import type { CreateUserParams, User } from "@/user/types";
import { type response } from "@/lib/types";
import CreateUserSchema from "@/user/schemas/create-user-schema";
import bcrypt from "bcrypt";

interface UserRepository {
  createUser: (user: CreateUserParams) => Promise<response<User>>;
  getUserByEmail: (email: string) => Promise<response<CreateUserParams>>;
}

export default async function createUser(
  repository: UserRepository,
  user: CreateUserParams,
): Promise<response<User>> {
  const parsedUser = CreateUserSchema.safeParse(user);
  if (!parsedUser.success) {
    return { success: false, message: parsedUser.error.message };
  }

  const foundResponse = await repository.getUserByEmail(user.email);
  if (foundResponse.success) {
    return { success: false, message: "El usuario ya existe" };
  }

  const encryptedPassword = await bcrypt.hash(user.password, 10);
  const createdResponse = await repository.createUser({
    ...user,
    password: encryptedPassword,
    name: "",
  });
  if (!createdResponse.success) {
    return { success: false, message: "Error creating user" };
  }

  return createdResponse;
}
