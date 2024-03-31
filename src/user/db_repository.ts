import prisma from "@/lib/prisma";
import { CreateUserParams, User } from "./types";
import { response } from "@/lib/types";

export const getUserByEmail = async (
  email: string,
): Promise<response<CreateUserParams>> => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, message: "User not found" };

    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const createUser = async (
  user: CreateUserParams,
): Promise<response<User>> => {
  try {
    const { password, ...persistedUser } = await prisma.user.create({
      data: { ...user, password: user.password },
    });

    return { success: true, data: persistedUser };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
