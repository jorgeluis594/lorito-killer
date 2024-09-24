import prisma from "@/lib/prisma";
import { CreateUserParams, User } from "./types";
import { response } from "@/lib/types";

export const getUserByEmail = async (
  email: string,
): Promise<response<CreateUserParams>> => {
  try {
    const user = await prisma().user.findUnique({ where: { email } });
    if (!user) return { success: false, message: "User not found" };

    return {
      success: true,
      data: { ...user, companyId: user.companyId || "some_company_id" },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const createUser = async (
  user: CreateUserParams,
): Promise<response<User>> => {
  try {
    const { password, ...persistedUser } = await prisma().user.create({
      data: { ...user, password: user.password },
    });

    return {
      success: true,
      data: { ...persistedUser, companyId: persistedUser.id! },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateUser = async (user: User): Promise<response<User>> => {
  try {
    const { password, ...persistedUser } = await prisma().user.update({
      where: { id: user.id },
      data: user,
    });

    return {
      success: true,
      data: {
        ...persistedUser,
        companyId: persistedUser.companyId || "some_company_id",
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updatePassword = async (
  userId: string,
  newPassword: string,
): Promise<response<User>> => {
  try {
    const { password, ...persistedUser } = await prisma().user.update({
      where: { id: userId },
      data: { password: newPassword },
    });

    return {
      success: true,
      data: {
        ...persistedUser,
        companyId: persistedUser.companyId || "some_company_id",
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
