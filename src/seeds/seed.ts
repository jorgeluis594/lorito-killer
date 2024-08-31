import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import fs from 'fs';
import csv from 'csv-parser';
import {$Enums} from "@prisma/client";
import PrismaLocalityType = $Enums.LocalityLevel;
import {COUNTRY, DEPARTMENT, DISTRICT, Locality, LocalityLevelType, PROVINCE} from "../locality/types";
const CustomerDocumentTypeToPrismaMapper: Record<
  LocalityLevelType,
  PrismaLocalityType
> = {
  [COUNTRY]: PrismaLocalityType.COUNTRY,
  [DEPARTMENT]: PrismaLocalityType.DEPARTMENT,
  [PROVINCE]: PrismaLocalityType.PROVINCE,
  [DISTRICT]: PrismaLocalityType.DISTRICT,
};

const locality = async () => {
  const results: Array<Locality> = [];

  fs.createReadStream('localities.csv')
    .pipe(csv())
    .on('data', (data: Locality) => results.push(data))
    .on('end', async () => {
      console.log('CSV file successfully processed');

      try {
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
              parentId: result.parentId || null,
            },
          });
        }

        console.log('Data successfully inserted');
      } catch (error) {
        console.error('Error inserting data:', error);
      } finally {
        await prisma.$disconnect();
      }
    });
};

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
