
-- =============================================
-- 1. UTILITY: updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- 2. PRODUCTS TABLE
-- =============================================
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  color TEXT NOT NULL DEFAULT 'hsl(243 75% 59%)',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete products" ON public.products FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. ROLES TABLE
-- =============================================
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert roles" ON public.roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update roles" ON public.roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete roles" ON public.roles FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. ACCESS GROUPS TABLE
-- =============================================
CREATE TABLE public.access_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.access_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read access_groups" ON public.access_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert access_groups" ON public.access_groups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update access_groups" ON public.access_groups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete access_groups" ON public.access_groups FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_access_groups_updated_at BEFORE UPDATE ON public.access_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 5. PROFILES TABLE (linked to auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.access_groups(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  first_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 6. CLIENTS TABLE
-- =============================================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 7. BACKLOGS TABLE
-- =============================================
CREATE TABLE public.backlogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  attachment TEXT,
  type TEXT NOT NULL DEFAULT 'functional' CHECK (type IN ('functional', 'technical')),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  thermometer TEXT NOT NULL DEFAULT 'medium' CHECK (thermometer IN ('low', 'medium', 'high')),
  phase TEXT NOT NULL DEFAULT 'prioritization' CHECK (phase IN ('prioritization', 'approval', 'refinement', 'available', 'planned', 'finished')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prioritization JSONB,
  approval JSONB,
  refinement JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.backlogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read backlogs" ON public.backlogs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert backlogs" ON public.backlogs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update backlogs" ON public.backlogs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete backlogs" ON public.backlogs FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_backlogs_updated_at BEFORE UPDATE ON public.backlogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 8. BACKLOG PHASE HISTORY TABLE
-- =============================================
CREATE TABLE public.backlog_phase_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backlog_id UUID NOT NULL REFERENCES public.backlogs(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('prioritization', 'approval', 'refinement', 'available', 'planned', 'finished')),
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.backlog_phase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read phase_history" ON public.backlog_phase_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert phase_history" ON public.backlog_phase_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update phase_history" ON public.backlog_phase_history FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete phase_history" ON public.backlog_phase_history FOR DELETE TO authenticated USING (true);

-- =============================================
-- 9. BACKLOG SUB ITEMS TABLE
-- =============================================
CREATE TABLE public.backlog_sub_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backlog_id UUID NOT NULL REFERENCES public.backlogs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  functional_detail TEXT NOT NULL DEFAULT '',
  technical_detail TEXT NOT NULL DEFAULT '',
  estimate INTEGER NOT NULL DEFAULT 0,
  attachment TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.backlog_sub_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sub_items" ON public.backlog_sub_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sub_items" ON public.backlog_sub_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sub_items" ON public.backlog_sub_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sub_items" ON public.backlog_sub_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_sub_items_updated_at BEFORE UPDATE ON public.backlog_sub_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 10. INDEXES
-- =============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_group_id ON public.profiles(group_id);
CREATE INDEX idx_backlogs_product_id ON public.backlogs(product_id);
CREATE INDEX idx_backlogs_client_id ON public.backlogs(client_id);
CREATE INDEX idx_backlogs_phase ON public.backlogs(phase);
CREATE INDEX idx_backlog_phase_history_backlog_id ON public.backlog_phase_history(backlog_id);
CREATE INDEX idx_backlog_sub_items_backlog_id ON public.backlog_sub_items(backlog_id);
