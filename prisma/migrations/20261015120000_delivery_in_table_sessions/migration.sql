-- Un delivery o un pedido para llevar es una sesión sin mesa. El índice único
-- (tableId, current) admite varias sesiones abiertas con tableId NULL.
ALTER TABLE "TableSession" ALTER COLUMN "tableId" DROP NOT NULL;

-- El cobro decide el medio de pago; "paga con" se anota en la referencia.
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_cash_pays_with_check";
ALTER TABLE "Delivery"
  DROP COLUMN "expectedPaymentMethod",
  DROP COLUMN "cashPaysWith",
  ALTER COLUMN "name" DROP NOT NULL;
DROP TYPE "DeliveryExpectedPayment";
