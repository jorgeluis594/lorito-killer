import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import fs from 'fs';
import csv from 'csv-parser';
import {$Enums} from "@prisma/client";
import PrismaLocalityType = $Enums.LocalityLevel;
import {DEPARTMENT, DISTRICT, Local, LocalityLevelType, PROVINCE} from "./type";

const CustomerDocumentTypeToPrismaMapper: Record<
  LocalityLevelType,
  PrismaLocalityType
> = {
  [DEPARTMENT]: PrismaLocalityType.DEPARTMENT,
  [PROVINCE]: PrismaLocalityType.PROVINCE,
  [DISTRICT]: PrismaLocalityType.DISTRICT,
};

const locality = async () => {
  const results: Array<Local> = [];
  fs.createReadStream('localities.csv')
    .pipe(csv())
    .on('data', (data: Local) => results.push(data))
    .on('end', async () => {
      console.log('CSV file successfully processed');

      for (const result of results) {
        await prisma.locality.create({
          data: {
            id: result.id,
            idUbigeo: result.idUbigeo,
            name: result.name,
            code: result.code,
            tag: result.tag,
            searchValue: result.searchValue,
            level: CustomerDocumentTypeToPrismaMapper[result.level],
            parentId: result.parentId,
          },
        });
      }

      console.log('Data successfully inserted');
    });
}

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

  await locality();

  console.log(user);
};

execute().then(() => {
  console.log("Listo buey");
});
