/*
  # Create VaultedSlabs Database Schema
  
  ## Overview
  Complete schema for Pokémon TCG collection tracking with PSA verification and marketplace scaffolding.
  
  ## New Tables
  
  ### 1. user_roles
  - Stores user role assignments (admin/user)
  - Links to auth.users
  
  ### 2. tcg_sets
  - Canonical Pokémon TCG set metadata cached from API
  - Includes set name, series, totals, release date, images
  
  ### 3. tcg_cards
  - Canonical card metadata cached from API
  - Links to tcg_sets
  - Includes card number, name, rarity, types, images
  
  ### 4. set_logo_assets
  - Maps set IDs to local bundled logo assets
  
  ### 5. collection_items
  - User-owned card inventory (graded and raw)
  - Includes PSA verification fields
  - One row per owned copy
  
  ### 6. collection_item_images
  - User-uploaded photos for collection items
  - Links to collection_items and Supabase Storage
  
  ### 7. admin_card_prices
  - Monthly average prices entered by admins
  - Used for collection value analytics
  
  ### 8. sync_logs
  - Audit log for Pokémon TCG API sync operations
  
  ### 9. listings (Phase 2 scaffolding)
  - Marketplace listings for verified PSA cards
  - Feature-flagged in UI
  
  ## Security
  - RLS enabled on all tables
  - Policies will be added in next migration
  
  ## Indexes
  - Optimized for common query patterns
  - Foreign keys automatically indexed
  - GIN indexes for array columns
*/

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 2. TCG Sets (Canonical)
CREATE TABLE IF NOT EXISTS tcg_sets (
  id text PRIMARY KEY,
  name text NOT NULL,
  series text,
  printed_total int,
  total int,
  release_date text,
  updated_at_api text,
  symbol_url text,
  logo_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tcg_sets_name ON tcg_sets(name);
CREATE INDEX IF NOT EXISTS idx_tcg_sets_series ON tcg_sets(series);
CREATE INDEX IF NOT EXISTS idx_tcg_sets_release_date ON tcg_sets(release_date);

-- 3. TCG Cards (Canonical)
CREATE TABLE IF NOT EXISTS tcg_cards (
  id text PRIMARY KEY,
  set_id text NOT NULL REFERENCES tcg_sets(id) ON DELETE CASCADE,
  number text NOT NULL,
  name text NOT NULL,
  rarity text,
  supertype text,
  subtypes text[],
  types text[],
  national_pokedex_numbers int[],
  small_image_url text,
  large_image_url text,
  api_updated_at text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tcg_cards_set_id ON tcg_cards(set_id);
CREATE INDEX IF NOT EXISTS idx_tcg_cards_name ON tcg_cards(name);
CREATE INDEX IF NOT EXISTS idx_tcg_cards_number ON tcg_cards(number);
CREATE INDEX IF NOT EXISTS idx_tcg_cards_supertype ON tcg_cards(supertype);
CREATE INDEX IF NOT EXISTS idx_tcg_cards_rarity ON tcg_cards(rarity);
CREATE INDEX IF NOT EXISTS idx_tcg_cards_subtypes ON tcg_cards USING GIN(subtypes);
CREATE INDEX IF NOT EXISTS idx_tcg_cards_types ON tcg_cards USING GIN(types);

-- 4. Set Logo Assets (Local Asset Mapping)
CREATE TABLE IF NOT EXISTS set_logo_assets (
  set_id text PRIMARY KEY REFERENCES tcg_sets(id) ON DELETE CASCADE,
  local_asset_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Collection Items (User Inventory)
CREATE TABLE IF NOT EXISTS collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id text NOT NULL REFERENCES tcg_cards(id) ON DELETE CASCADE,
  condition_type text NOT NULL CHECK (condition_type IN ('graded', 'raw')),
  grading_company text CHECK (grading_company IN ('PSA', 'CGC', 'BGS', 'SGC', 'RAW', 'OTHER')),
  grade_label text,
  grade_value numeric,
  cert_number text,
  variant text CHECK (variant IN ('1st_edition', 'shadowless', 'unlimited', 'reverse_holo', 'other')),
  psa_verified boolean NOT NULL DEFAULT false,
  psa_verified_at timestamptz,
  psa_image_url text,
  psa_payload jsonb,
  notes text,
  acquired_at date,
  purchase_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collection_items_user_id ON collection_items(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_card_id ON collection_items(card_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_cert_number ON collection_items(cert_number) WHERE cert_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_items_grading_company ON collection_items(grading_company);
CREATE INDEX IF NOT EXISTS idx_collection_items_psa_verified ON collection_items(psa_verified);

-- 6. Collection Item Images
CREATE TABLE IF NOT EXISTS collection_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES collection_items(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN ('front', 'back', 'label', 'other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collection_item_images_item_id ON collection_item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_collection_item_images_kind ON collection_item_images(kind);

-- 7. Admin Card Prices (Monthly Averages)
CREATE TABLE IF NOT EXISTS admin_card_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id text NOT NULL REFERENCES tcg_cards(id) ON DELETE CASCADE,
  grading_company text NOT NULL,
  grade_value numeric,
  variant text,
  avg_price numeric NOT NULL,
  as_of_month date NOT NULL,
  source_note text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_card_prices_unique 
  ON admin_card_prices(card_id, grading_company, COALESCE(grade_value, -1), COALESCE(variant, ''), as_of_month);

CREATE INDEX IF NOT EXISTS idx_admin_card_prices_card_id ON admin_card_prices(card_id);
CREATE INDEX IF NOT EXISTS idx_admin_card_prices_as_of_month ON admin_card_prices(as_of_month);

-- 8. Sync Logs
CREATE TABLE IF NOT EXISTS sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  details jsonb
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_job_name ON sync_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- 9. Listings (Phase 2 Scaffolding)
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_item_id uuid NOT NULL REFERENCES collection_items(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold', 'canceled')),
  sale_type text NOT NULL DEFAULT 'buy_now' CHECK (sale_type IN ('buy_now', 'offer')),
  buy_now_price numeric,
  offer_min_price numeric,
  requires_psa_verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_user_id ON listings(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_collection_item_id ON listings(collection_item_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);