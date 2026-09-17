import { z } from "zod";
import { TableReceiptSchema } from "@/table/payment-schema";

const money = z.number().finite().nonnegative().max(9999999).multipleOf(0.01);

export const FulfillmentPaymentSchema = z.object({
  orderId: z.string().uuid(),
  orderVersion: z.string().datetime(),
  expectedTotal: money.positive(),
  cashShiftId: z.string().uuid(),
  method: z.enum(["debit_card", "credit_card", "wallet", "cash", "combine"]),
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
});

export type FulfillmentPaymentInput = z.infer<typeof FulfillmentPaymentSchema>;
