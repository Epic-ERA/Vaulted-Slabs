/*
  # Fix Security and Performance Issues

  ## Overview
  Addresses security warnings and performance optimizations identified by Supabase linter.

  ## Changes Made

  ### 1. Index Optimization
  - Add missing index on `admin_card_prices.updated_by` foreign key for optimal query performance

  ### 2. RLS Performance Optimization
  All `auth.uid()` calls wrapped in `(select auth.uid())` to avoid re-evaluation per row:
  - user_roles: 1 policy updated
  - collection_items: 4 policies updated  
  - collection_item_images: 4 policies updated
  - listings: 4 policies updated

  ### 3. Function Security
  - Fix `is_admin()` function to have immutable search_path
  - Wrap auth.uid() in SELECT for better performance

  ### 4. Policy Consolidation
  - Consolidate duplicate SELECT policies on sync_logs
  - Keep intentional multiple policies where they serve different access patterns

  ## Security Notes
  - All changes maintain existing security model
  - No reduction in security posture
  - Improves performance at scale
*/

-- 1. Add missing foreign key index
CREATE INDEX IF NOT EXISTS idx_admin_card_prices_updated_by 
  ON admin_card_prices(updated_by);

-- 2. Fix is_admin function with proper search_path and optimized auth.uid()
DROP FUNCTION IF EXISTS is_admin() CASCADE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (select auth.uid())
    AND role = 'admin'
  );
$$;

-- 3. Recreate admin policies (they were dropped with CASCADE)
CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage sets"
  ON tcg_sets FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage cards"
  ON tcg_cards FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage logo assets"
  ON set_logo_assets FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage card prices"
  ON admin_card_prices FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage sync logs"
  ON sync_logs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Update user_roles policies
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 5. Update collection_items policies
DROP POLICY IF EXISTS "Users can view own collection items" ON collection_items;
CREATE POLICY "Users can view own collection items"
  ON collection_items FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own collection items" ON collection_items;
CREATE POLICY "Users can insert own collection items"
  ON collection_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own collection items" ON collection_items;
CREATE POLICY "Users can update own collection items"
  ON collection_items FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own collection items" ON collection_items;
CREATE POLICY "Users can delete own collection items"
  ON collection_items FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- 6. Update collection_item_images policies
DROP POLICY IF EXISTS "Users can view own item images" ON collection_item_images;
CREATE POLICY "Users can view own item images"
  ON collection_item_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own item images" ON collection_item_images;
CREATE POLICY "Users can insert own item images"
  ON collection_item_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own item images" ON collection_item_images;
CREATE POLICY "Users can update own item images"
  ON collection_item_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own item images" ON collection_item_images;
CREATE POLICY "Users can delete own item images"
  ON collection_item_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = (select auth.uid())
    )
  );

-- 7. Update listings policies
DROP POLICY IF EXISTS "Sellers can view own listings" ON listings;
CREATE POLICY "Sellers can view own listings"
  ON listings FOR SELECT
  TO authenticated
  USING (seller_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Sellers can insert own listings" ON listings;
CREATE POLICY "Sellers can insert own listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (seller_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Sellers can update own listings" ON listings;
CREATE POLICY "Sellers can update own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (seller_user_id = (select auth.uid()))
  WITH CHECK (seller_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Sellers can delete own listings" ON listings;
CREATE POLICY "Sellers can delete own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (seller_user_id = (select auth.uid()));

-- 8. Remove duplicate sync_logs SELECT policy (FOR ALL covers SELECT)
DROP POLICY IF EXISTS "Admins can view sync logs" ON sync_logs;