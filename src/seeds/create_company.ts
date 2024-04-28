import prisma from "../lib/prisma";

const execute = async () => {
  const company = await prisma.company.create({
    data: {
      id: crypto.randomUUID(),
      name: "Company 1",
      address: "Address 1",
      phone: "1234567890",
      email: "test@test.com",
      createdAt: new Date(),
    },
  });

  const users = await prisma.user.findMany();
  const response = await prisma.user.updateMany({
    where: { id: { in: users.map((u) => u.id) } },
    data: { companyId: company.id },
  });
  console.log(response);

  const products = await prisma.product.findMany();
  const productsResponse = await prisma.product.updateMany({
    where: { id: { in: products.map((p) => p.id) } },
    data: { companyId: company.id },
  });

  console.log(productsResponse);
};

execute().then(() => {
  console.log("Listo buey");
});
