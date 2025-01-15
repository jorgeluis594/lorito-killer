import prisma from "@/lib/prisma";
import { Category } from "./types";
import { Product } from "@/product/types";
import { response } from "@/lib/types";
import { Category as PrismaCategory, Prisma } from "@prisma/client";

export const create = async (
  category: Category,
): Promise<response<Category>> => {
  try {
    const foundResponse = await findByName(category.companyId, category.name);
    if (foundResponse.success) {
      return {success: false, message: "Esta categoria ya existe."};
    }

    const createdCategory = await prisma().category.create({ data: category });
    return {
      success: true,
      data: {
        ...createdCategory,
        companyId: createdCategory.companyId || "some_company_id",
      },
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const update = async (
  category: Category,
): Promise<response<Category>> => {
  const { companyId, ...categoryData } = category;

  try {
    await prisma().category.update({
      where: { id: category.id },
      data: category,
    });
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const deleteCategory = async (
  category: Category,
): Promise<response<Category>> => {
  try {
    const deleteCategory = await prisma().category.delete({
      where: { id: category.id },
    });
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const getMany = async (
  companyId: string,
): Promise<response<Category[]>> => {
  try {
    const categories = (
      await prisma().category.findMany({ where: { companyId } })
    ).map((c) => ({
      ...c,
      companyId: c.companyId || "some_company_id",
    }));

    return { success: true, data: categories };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const find = async (id: string): Promise<response<Category>> => {
  try {
    const category = await prisma().category.findUnique({ where: { id } });

    if (category) {
      return {
        success: true,
        data: {
          ...category,
          companyId: category.companyId || "some_company_id",
        },
      };
    } else {
      return { success: false, message: "Category not found" };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const addCategoryToProduct = async (
  product: Product,
  category: Category,
): Promise<response<Category>> => {
  try {
    await prisma().category.update({
      where: { id: category.id },
      data: {
        products: {
          connect: { id: product.id },
        },
      },
    });

    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const removeCategoryFromProduct = async (
  product: Product,
  category: Category,
): Promise<response<Category>> => {
  try {
    await prisma().category.update({
      where: { id: category.id },
      data: {
        products: {
          disconnect: { id: product.id },
        },
      },
    });
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

const findByName = async (
  companyId: string,
  name: string,
): Promise<response<Category>> => {
  try {
    const categories = await prisma().category.findMany({
      where: {
        companyId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      take: 1,
    });

    if (categories.length) {
      return {
        success: true,
        data: {
          ...categories[0],
          companyId: categories[0].companyId || "some_company_id",
        },
      };
    } else {
      return { success: false, message: "Category not found" };
    }
  } catch (error: any) {
    return { success: false, message: error.message } as response;
  }
};
