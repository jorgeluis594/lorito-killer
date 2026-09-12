import { z } from "zod";

const money = z.number().finite().nonnegative().max(9999999).multipleOf(0.01);

export const TableReceiptSchema = z
  .object({
    documentType: z.enum(["ticket", "receipt", "invoice"]),
    customer: z
      .object({
        documentType: z.enum(["DNI", "RUC", "CARNET_EXTRANJERIA"]),
        documentNumber: z
          .string()
          .trim()
          .min(1, "Ingresa el documento")
          .max(15),
        legalName: z
          .string()
          .trim()
          .min(3, "Ingresa el nombre completo o razón social")
          .max(200),
        address: z.string().trim().max(300),
      })
      .superRefine((customer, ctx) => {
        const valid =
          customer.documentType === "DNI"
            ? /^\d{8}$/.test(customer.documentNumber)
            : customer.documentType === "RUC"
              ? /^\d{11}$/.test(customer.documentNumber)
              : /^[a-zA-Z0-9]{1,15}$/.test(customer.documentNumber);
        if (!valid)
          ctx.addIssue({
            code: "custom",
            path: ["documentNumber"],
            message: "Revisa el número de documento",
          });
      })
      .optional(),
  })
  .superRefine((input, ctx) => {
    if (input.documentType === "invoice") {
      if (input.customer?.documentType !== "RUC")
        ctx.addIssue({
          code: "custom",
          path: ["customer", "documentNumber"],
          message: "La factura requiere un cliente con RUC",
        });
      if (!input.customer?.address)
        ctx.addIssue({
          code: "custom",
          path: ["customer", "address"],
          message: "Ingresa la dirección fiscal",
        });
    }
  });

export const TablePaymentSchema = z
  .object({
    sessionId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    orderVersion: z.string().datetime(),
    expectedTotal: money.positive(),
    cashShiftId: z.string().uuid().nullable(),
    method: z.enum([
      "debit_card",
      "credit_card",
      "wallet",
      "cash",
      "combine",
      "register",
    ]),
    receipt: TableReceiptSchema,
    cashReceived: money.optional(),
    contributions: z
      .object({
        cash: money,
        debit_card: money,
        credit_card: money,
        wallet: money,
      })
      .optional(),
    wallet: z
      .object({ name: z.string().max(80), operationCode: z.string().max(100) })
      .optional(),
  })
  .strict();

export type TablePaymentInput = z.infer<typeof TablePaymentSchema>;
export type TableReceiptInput = z.infer<typeof TableReceiptSchema>;
