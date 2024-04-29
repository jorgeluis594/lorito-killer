import prisma from "../lib/prisma";

const execute = async () => {
  const company = await prisma.company.create({
    data: {
      id: crypto.randomUUID(),
      name: "Market Chavez",
      address: "Km 17, Pucallpa, Manantay",
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

  const cashShifts = await prisma.cashShift.findMany();
  const cashShiftsResponse = await prisma.cashShift.updateMany({
    where: { id: { in: cashShifts.map((cs) => cs.id) } },
    data: { companyId: company.id },
  });

  console.log(cashShiftsResponse);

  const orders = await prisma.order.findMany();
  const ordersResponse = await prisma.order.updateMany({
    where: { id: { in: orders.map((o) => o.id) } },
    data: { companyId: company.id },
  });

  console.log(ordersResponse);
};

execute().then(() => {
  console.log("Listo buey");
});
