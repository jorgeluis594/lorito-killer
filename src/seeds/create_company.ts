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
};

execute().then(() => {
  console.log("Listo buey");
});
