CREATE EXTENSION IF NOT EXISTS unaccent;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE OR REPLACE FUNCTION product_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.sku, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.description, ''))), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'product_search_vector_trigger'
      AND tgrelid = '"Product"'::regclass
  ) THEN
    CREATE TRIGGER product_search_vector_trigger
    BEFORE INSERT OR UPDATE OF name, sku, description
    ON "Product"
    FOR EACH ROW
    EXECUTE FUNCTION product_search_vector_update();
  END IF;
END;
$$;

UPDATE "Product"
SET "searchVector" =
  setweight(to_tsvector('simple', unaccent(coalesce(name, ''))), 'A') ||
  setweight(to_tsvector('simple', unaccent(coalesce(sku, ''))), 'B') ||
  setweight(to_tsvector('simple', unaccent(coalesce(description, ''))), 'D')
WHERE "searchVector" IS NULL;

CREATE INDEX IF NOT EXISTS product_search_vector_idx
ON "Product"
USING GIN ("searchVector");
