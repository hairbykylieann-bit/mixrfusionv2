-- Drop the old lowercase check constraint
ALTER TABLE catalog_products DROP CONSTRAINT IF EXISTS catalog_products_type_check;