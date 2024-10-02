import prisma from "../lib/prisma";
import { Category } from "@prisma/client";

const execute = async () => {
  const company = (await prisma().company.findMany({}))[1];
  const products = await prisma().product.findMany({
    where: { companyId: company.id },
    include: { categories: true },
  });

  const companyCategories: Record<string, Category | undefined> = (
    await prisma().category.findMany({ where: { companyId: company.id } })
  ).reduce((acc: Record<string, Category>, c) => {
    if (!acc[c.id]) {
      acc[c.id] = c;
    }

    return acc;
  }, {});

  for (const p of products) {
    for (const c of p.categories) {
      if (companyCategories[c.id]) {
        continue;
      }

      const response = await prisma().product.update({
        where: { id: p.id },
        data: {
          categories: {
            disconnect: { id: c.id },
          },
        },
      });

      console.log({ response });
    }
  }
};

execute().then(() => {
  console.log("Listo buey");
});
