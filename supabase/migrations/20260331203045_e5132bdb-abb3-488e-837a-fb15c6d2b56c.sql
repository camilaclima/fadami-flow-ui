
-- 1. Create client_contacts table for multiple contacts per client
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  concession TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID NULL
);

-- 2. Junction table: profile <-> products (many-to-many)
CREATE TABLE public.profile_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, product_id)
);

-- 3. Junction table: profile <-> access_groups (many-to-many)
CREATE TABLE public.profile_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.access_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_id, group_id)
);

-- 4. RLS for client_contacts
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read client_contacts" ON public.client_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert client_contacts" ON public.client_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update client_contacts" ON public.client_contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete client_contacts" ON public.client_contacts FOR DELETE TO authenticated USING (true);

-- 5. RLS for profile_products
ALTER TABLE public.profile_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read profile_products" ON public.profile_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert profile_products" ON public.profile_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete profile_products" ON public.profile_products FOR DELETE TO authenticated USING (true);

-- 6. RLS for profile_groups
ALTER TABLE public.profile_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read profile_groups" ON public.profile_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert profile_groups" ON public.profile_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete profile_groups" ON public.profile_groups FOR DELETE TO authenticated USING (true);

-- 7. Triggers for updated_at
CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Indexes
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_profile_products_profile_id ON public.profile_products(profile_id);
CREATE INDEX idx_profile_groups_profile_id ON public.profile_groups(profile_id);

-- 9. Enable realtime for client_contacts
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_contacts;
