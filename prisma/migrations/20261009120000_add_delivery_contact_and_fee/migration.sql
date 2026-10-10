-- Las columnas obligatorias se agregan sin default: la tabla debe estar vacía
-- (no existen pedidos Delivery con datos de contacto que migrar).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Delivery") THEN
    RAISE EXCEPTION 'Delivery contiene filas sin datos de entrega; migrarlas antes de aplicar esta migración';
  END IF;
END $$;

CREATE TYPE "DeliveryExpectedPayment" AS ENUM ('CASH', 'WALLET');

ALTER TABLE "Delivery"
  ADD COLUMN "name" TEXT NOT NULL,
  ADD COLUMN "phone" TEXT NOT NULL,
  ADD COLUMN "address" TEXT NOT NULL,
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "fee" DECIMAL(10,2) NOT NULL,
  ADD COLUMN "expectedPaymentMethod" "DeliveryExpectedPayment",
  ADD COLUMN "cashPaysWith" DECIMAL(10,2);

ALTER TABLE "Delivery"
  ADD CONSTRAINT "Delivery_fee_check" CHECK ("fee" >= 0),
  ADD CONSTRAINT "Delivery_phone_check" CHECK ("phone" ~ '^9[0-9]{8}$'),
  -- COALESCE: con medio NULL la comparación es NULL y el CHECK lo dejaría pasar.
  ADD CONSTRAINT "Delivery_cash_pays_with_check" CHECK ("cashPaysWith" IS NULL OR (COALESCE("expectedPaymentMethod" = 'CASH', false) AND "cashPaysWith" > 0));
