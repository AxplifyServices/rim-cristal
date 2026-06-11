\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,

    name_fr VARCHAR(160) NOT NULL,
    name_en VARCHAR(160),
    slug VARCHAR(180) NOT NULL UNIQUE,

    level INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS subcategory_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS room_tags JSONB NOT NULL DEFAULT '[]';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS material_tags JSONB NOT NULL DEFAULT '[]';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS style_tags JSONB NOT NULL DEFAULT '[]';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS dimensions JSONB NOT NULL DEFAULT '{}';

ALTER TABLE products
ADD COLUMN IF NOT EXISTS care_instructions TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS origin_country VARCHAR(120);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS collection_name VARCHAR(160);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS seo_description TEXT;

CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_slug ON product_categories(slug);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_room_tags ON products USING GIN(room_tags);
CREATE INDEX IF NOT EXISTS idx_products_material_tags ON products USING GIN(material_tags);
CREATE INDEX IF NOT EXISTS idx_products_style_tags ON products USING GIN(style_tags);

COMMIT;