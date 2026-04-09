-- Allow anyone to read partner profiles (needed for public storefront pages)
CREATE POLICY "partners: public read" ON partners
  FOR SELECT USING (true);

-- Allow anyone to read subscribers count (needed for sign-up page)
-- (subscribers table already has its own policies via subscribers migration)

-- Allow public reads on items for storefront display
-- (items are already readable via drop_items policy, but direct item reads may be needed)
CREATE POLICY "items: public read" ON items
  FOR SELECT USING (archived_at IS NULL);
