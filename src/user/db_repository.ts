import prisma from "@/lib/prisma";
import { User } from "./types";
import { response } from "@/lib/types";

export const getUserByEmail = async (
  email: string,
): Promise<response<User>> => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, message: "User not found" };

    return { success: true, data: user };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
