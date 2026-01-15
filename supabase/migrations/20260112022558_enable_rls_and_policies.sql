/*
  # Enable RLS and Create Security Policies
  
  ## Overview
  Implements Row Level Security policies for all VaultedSlabs tables following the principle of least privilege.
  
  ## Security Model
  
  ### Public Read Tables
  - tcg_sets: Anyone can read canonical set data
  - tcg_cards: Anyone can read canonical card data
  - set_logo_assets: Anyone can read logo mappings
  - admin_card_prices: Anyone can read price data for analytics
  
  ### User-Owned Tables
  - collection_items: Users can only see/modify their own items
  - collection_item_images: Users can only see/modify images for their items
  
  ### Admin-Only Tables
  - user_roles: Admins can manage; users can read their own role
  - Admin write operations on public tables (via server functions)
  
  ### Phase 2 Tables
  - listings: Sellers manage their own; public read for active listings (when enabled)
  
  ## Helper Functions
  - is_admin(): Check if current user has admin role
*/

-- Helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 1. User Roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2. TCG Sets (Public Read, Admin Write)
ALTER TABLE tcg_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sets"
  ON tcg_sets FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage sets"
  ON tcg_sets FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 3. TCG Cards (Public Read, Admin Write)
ALTER TABLE tcg_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cards"
  ON tcg_cards FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage cards"
  ON tcg_cards FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. Set Logo Assets (Public Read, Admin Write)
ALTER TABLE set_logo_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view logo assets"
  ON set_logo_assets FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage logo assets"
  ON set_logo_assets FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 5. Collection Items (Owner Only)
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collection items"
  ON collection_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own collection items"
  ON collection_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own collection items"
  ON collection_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own collection items"
  ON collection_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 6. Collection Item Images (Owner Only via Item)
ALTER TABLE collection_item_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own item images"
  ON collection_item_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own item images"
  ON collection_item_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own item images"
  ON collection_item_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own item images"
  ON collection_item_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collection_items
      WHERE collection_items.id = collection_item_images.item_id
      AND collection_items.user_id = auth.uid()
    )
  );

-- 7. Admin Card Prices (Public Read, Admin Write)
ALTER TABLE admin_card_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view card prices"
  ON admin_card_prices FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage card prices"
  ON admin_card_prices FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 8. Sync Logs (Admin Only)
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON sync_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage sync logs"
  ON sync_logs FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 9. Listings (Phase 2 - Seller Manages, Public Reads Active)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own listings"
  ON listings FOR SELECT
  TO authenticated
  USING (seller_user_id = auth.uid());

CREATE POLICY "Anyone can view active listings"
  ON listings FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Sellers can insert own listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (seller_user_id = auth.uid());

CREATE POLICY "Sellers can update own listings"
  ON listings FOR UPDATE
  TO authenticated
  USING (seller_user_id = auth.uid())
  WITH CHECK (seller_user_id = auth.uid());

CREATE POLICY "Sellers can delete own listings"
  ON listings FOR DELETE
  TO authenticated
  USING (seller_user_id = auth.uid());