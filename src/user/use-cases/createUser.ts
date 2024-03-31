import { type User } from "@/user/types";
import { type response } from "@/lib/types";
import CreateUserSchema from "@/user/schemas/create-user-schema";

interface UserRepository {
  createUser: (user: User) => Promise<response<User>>;
  getUserByEmail: (email: string) => Promise<response<User>>;
}

export default async function createUser(
  repository: UserRepository,
  user: User,
): Promise<response<User>> {
  const parsedUser = CreateUserSchema.safeParse(user);
  if (!parsedUser.success) {
    return { success: false, message: parsedUser.error.message };
  }

  const foundResponse = await repository.getUserByEmail(user.email);
  if (foundResponse.success) {
    return { success: false, message: "User already exists" };
  }

  const createdResponse = await repository.createUser(user);
  if (!createdResponse.success) {
    return { success: false, message: "Error creating user" };
  }

  return createdResponse;
}
