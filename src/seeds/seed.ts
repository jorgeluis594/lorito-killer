import prisma from "../lib/prisma";
import bcrypt from "bcrypt";
import fs from "fs";
import csv from "csv-parser";
import { $Enums } from "@prisma/client";
import PrismaLocalityType = $Enums.LocalityLevel;
import { Locality, LocalityLevelType } from "../locality/types";
const CustomerDocumentTypeToPrismaMapper: Record<
  "0" | "1" | "2" | "3",
  PrismaLocalityType
> = {
  "0": PrismaLocalityType.COUNTRY,
  "1": PrismaLocalityType.DEPARTMENT,
  "2": PrismaLocalityType.PROVINCE,
  "3": PrismaLocalityType.DISTRICT,
};

const locality = async () => {
  const results: any = [];

  fs.createReadStream("src/seeds/localities.csv")
    .pipe(csv())
    .on("data", (data: Locality) => results.push(data))
    .on("end", async () => {
      console.log("CSV file successfully processed");

      try {
        for (const result of results) {
          await prisma().locality.create({
            data: {
              id: result.id,
              idUbigeo: result.idUbigeo,
              name: result.name,
              code: result.code,
              tag: result.tag,
              searchValue: result.searchValue,
              level:
                CustomerDocumentTypeToPrismaMapper[
                  result.level as "0" | "1" | "2" | "3"
                ],
              parentId: result.parentId || null,
            },
          });
        }

        console.log("Data successfully inserted");
      } catch (error) {
        console.error("Error inserting data:", error);
      } finally {
        await prisma().$disconnect();
      }
    });
};

const execute = async () => {
  const company = await prisma().company.create({
    data: {
      id: crypto.randomUUID(),
      name: "Company 1",
      subName: "Subname 1",
      department: "UCAYALI",
      district: "CALLERIA",
      provincial: "CORONEL PORTILLO",
      address: "Address 1",
      phone: "1234567890",
      email: "test@test.com",
      subdomain: "fantastidog",
      billingCredentials: {
        billingToken: process.env.BILLING_TOKEN,
        customerSearchToken: process.env.CUSTOMER_SEARCH_TOKEN,
        invoiceSerialNumber: process.env.INVOICE_SERIAL_NUMBER,
        receiptSerialNumber: process.env.RECEIPT_SERIAL_NUMBER,
        ticketSerialNumber: process.env.TICKET_SERIAL_NUMBER,
        establishmentCode: process.env.ESTABLISHMENT_CODE,
      },
      createdAt: new Date(),
    },
  });

  const user = await prisma().user.create({
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
