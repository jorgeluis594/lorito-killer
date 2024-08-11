import prisma from "../lib/prisma";
import bcrypt from "bcrypt";

const execute = async () => {
  const company = await prisma.company.create({
    data: {
      id: crypto.randomUUID(),
      name: "Company 1",
      address: "Address 1",
      phone: "1234567890",
      email: "test@test.com",
      subdomain: "fantastidog",
      createdAt: new Date(),
    },
  });

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: "jorg3.594@gmail.com",
      password: await bcrypt.hash("123456", 10),
      companyId: company.id,
      name: "Jorge Gonzalez",
    },
  });

  console.log(user);
};

execute().then(() => {
  console.log("Listo buey");
});
