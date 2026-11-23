-- Migration 0003: shared garment size charts
CREATE TABLE IF NOT EXISTS size_charts (
  garment_type TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
