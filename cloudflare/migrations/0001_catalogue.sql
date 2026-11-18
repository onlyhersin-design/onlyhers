-- OnlyHers Cloudflare D1 schema
-- Migration 0001: catalogue tables
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  created_at TEXT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL,
  image_url TEXT,
  sizes TEXT NOT NULL DEFAULT '[]', -- JSON array
  category TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  image_urls TEXT NOT NULL DEFAULT '[]', -- JSON array
  product_code TEXT,
  size_chart_url TEXT,
  material TEXT,
  wash_care TEXT,
  more_details TEXT,
  homepage_order INTEGER,
  instagram_photo_url TEXT,
  instagram_link TEXT,
  youtube_photo_url TEXT,
  youtube_link TEXT,
  collection_section TEXT NOT NULL DEFAULT 'onlyhers_designs'
    CHECK (collection_section IN ('onlyhers_designs','customisations','recreations'))
);

CREATE TABLE IF NOT EXISTS fabrics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL,
  fabric_code TEXT,
  material TEXT,
  width TEXT,
  image_url TEXT,
  image_urls TEXT NOT NULL DEFAULT '[]', -- JSON array
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT,
  pattern TEXT,
  available_meters INTEGER NOT NULL DEFAULT 0,
  instagram_photo_url TEXT,
  instagram_link TEXT,
  youtube_photo_url TEXT,
  youtube_link TEXT,
  wholesale_price REAL
);

CREATE INDEX IF NOT EXISTS idx_products_collection_order
  ON products(collection_section, homepage_order DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_available
  ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_fabrics_created
  ON fabrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fabrics_available
  ON fabrics(is_available);
CREATE INDEX IF NOT EXISTS idx_fabrics_code
  ON fabrics(fabric_code);
CREATE INDEX IF NOT EXISTS idx_products_code
  ON products(product_code);
