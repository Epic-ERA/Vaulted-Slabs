/*
  # Add Profiles Table and Schema Adjustments
  
  ## Overview
  Adds the missing profiles table and adjusts existing schema to match requirements.
  
  ## 1. New Tables
  
  ### profiles
  - `id` (uuid, primary key) - references auth.users.id
  - `email` (text) - user email
  - `full_name` (text) - user's full name
  - `display_name` (text) - display name for UI
  - `username` (text, unique) - unique username
  - `favorite_pokemon` (text) - favorite Pokemon
  - `collecting_focus` (text) - what they collect
  - `country`, `region`, `city` (text) - location info
  - `created_at`, `updated_at` (timestamptz) - timestamps
  
  ## 2. Schema Changes
  
  ### user_roles table
  - Change from single role per user to multiple roles per user
  - Add `id` field as primary key
  - Add UNIQUE constraint on (user_id, role)
  - Update foreign keys to reference profiles table
  
  ### set_logo_assets table
  - Add `id` field as primary key
  - Make (set_id, local_asset_key) unique instead of set_id being primary
  
  ### Update foreign keys
  - collection_items: user_id now references profiles(id)
  - listings: seller_user_id now references profiles(id)
  - admin_card_prices: updated_by now references profiles(id)
  
  ## 3. Triggers
  - Auto-update `updated_at` on profiles table
  
  ## 4. Security
  - Enable RLS on profiles
  - Add policies for profile management
  - Update existing policies to work with new schema
  
  ## 5. Important Notes
  - Existing data is preserved where possible
  - Foreign key relationships updated to use profiles
  - Maintains all existing security policies
*/

-- ============================================================================
-- 1. CREATE PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  display_name text,
  username text UNIQUE,
  favorite_pokemon text,
  collecting_focus text,
  country text,
  region text,
  city text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- ============================================================================
-- 2. UPDATE USER_ROLES TABLE TO SUPPORT MULTIPLE ROLES
-- ============================================================================

-- Create new user_roles table with proper structure
DO $$
BEGIN
  -- Check if the new structure already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'id'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
    DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
    
    -- Rename old table
    ALTER TABLE user_roles RENAME TO user_roles_old;
    
    -- Create new table
    CREATE TABLE user_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      role text NOT NULL CHECK (role IN ('admin', 'user')),
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, role)
    );
    
    -- Migrate data
    INSERT INTO user_roles (user_id, role, created_at)
    SELECT user_id, role, created_at FROM user_roles_old
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Drop old table
    DROP TABLE user_roles_old;
    
    -- Recreate indexes
    CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX idx_user_roles_role ON user_roles(role);
    
    -- Enable RLS
    ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
    
    -- Recreate policies
    CREATE POLICY "Users can read own role"
      ON user_roles FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
    
    CREATE POLICY "Admins can manage all roles"
      ON user_roles FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

-- ============================================================================
-- 3. UPDATE SET_LOGO_ASSETS TABLE STRUCTURE
-- ============================================================================

DO $$
BEGIN
  -- Check if id column already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'set_logo_assets' AND column_name = 'id' AND column_default LIKE '%gen_random_uuid%'
  ) THEN
    -- Drop the primary key constraint on set_id
    ALTER TABLE set_logo_assets DROP CONSTRAINT IF EXISTS set_logo_assets_pkey;
    
    -- Add id column if it doesn't exist
    ALTER TABLE set_logo_assets ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
    
    -- Set id as primary key
    ALTER TABLE set_logo_assets ADD PRIMARY KEY (id);
    
    -- Add unique constraint on (set_id, local_asset_key)
    ALTER TABLE set_logo_assets DROP CONSTRAINT IF EXISTS set_logo_assets_set_id_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_set_logo_assets_unique 
      ON set_logo_assets(set_id, local_asset_key);
  END IF;
END $$;

-- ============================================================================
-- 4. UPDATE FOREIGN KEYS TO REFERENCE PROFILES
-- ============================================================================

-- Update collection_items to reference profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'collection_items_user_id_fkey' 
    AND table_name = 'collection_items'
  ) THEN
    ALTER TABLE collection_items DROP CONSTRAINT collection_items_user_id_fkey;
    ALTER TABLE collection_items ADD CONSTRAINT collection_items_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update listings to reference profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'listings_seller_user_id_fkey' 
    AND table_name = 'listings'
  ) THEN
    ALTER TABLE listings DROP CONSTRAINT listings_seller_user_id_fkey;
    ALTER TABLE listings ADD CONSTRAINT listings_seller_user_id_fkey 
      FOREIGN KEY (seller_user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update admin_card_prices to reference profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_card_prices_updated_by_fkey' 
    AND table_name = 'admin_card_prices'
  ) THEN
    ALTER TABLE admin_card_prices DROP CONSTRAINT admin_card_prices_updated_by_fkey;
    ALTER TABLE admin_card_prices ADD CONSTRAINT admin_card_prices_updated_by_fkey 
      FOREIGN KEY (updated_by) REFERENCES profiles(id);
  END IF;
END $$;

-- ============================================================================
-- 5. CREATE TRIGGER FOR AUTO-UPDATING PROFILES.UPDATED_AT
-- ============================================================================

-- Function to auto-update updated_at timestamp (may already exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();