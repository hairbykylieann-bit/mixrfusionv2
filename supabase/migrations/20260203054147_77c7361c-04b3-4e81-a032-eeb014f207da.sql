-- Add new check constraint with capitalized values to match the products table enum
ALTER TABLE catalog_products ADD CONSTRAINT catalog_products_type_check 
CHECK (type = ANY (ARRAY['Color'::text, 'Developer'::text, 'Lightener'::text, 'Treatment'::text, 'Toner'::text, 'Additive'::text]));