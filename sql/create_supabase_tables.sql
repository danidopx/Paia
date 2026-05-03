-- Supabase / Postgres schema for Paia activities

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: activities
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  theme text,
  expected_responses integer DEFAULT 1,
  attachments jsonb DEFAULT '[]'::jsonb,
  responses jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'rascunho',
  progress integer DEFAULT 0,
  winner text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  sent_at timestamptz
);

-- Table: activity_submissions
CREATE TABLE IF NOT EXISTS public.activity_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  student_name text,
  response_text text,
  attachment_url text,
  status text DEFAULT 'enviada',
  ai_evaluation jsonb,
  final_score numeric,
  admin_summary text,
  started_at timestamptz,
  submitted_at timestamptz DEFAULT now(),
  evaluated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table: contacts (phones)
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: activity_links
CREATE TABLE IF NOT EXISTS public.activity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  token text,
  phone text,
  url text,
  sent_at timestamptz,
  status text DEFAULT 'sent'
);

-- Table: relatorios_cientificos
CREATE TABLE IF NOT EXISTS public.relatorios_cientificos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text,
  observacao text,
  hipotese text,
  conclusao text,
  created_at timestamptz DEFAULT now()
);

-- Enable row level security and create basic table access policies.
-- These policies preserve the existing public anon workflow while making access explicit.
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_cientificos ENABLE ROW LEVEL SECURITY;

CREATE POLICY activities_select_all ON public.activities FOR SELECT USING (true);
CREATE POLICY activities_insert_all ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY activities_update_all ON public.activities FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY activities_delete_all ON public.activities FOR DELETE USING (true);

CREATE POLICY activity_submissions_select_all ON public.activity_submissions FOR SELECT USING (true);
CREATE POLICY activity_submissions_insert_all ON public.activity_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY activity_submissions_update_all ON public.activity_submissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY activity_submissions_delete_all ON public.activity_submissions FOR DELETE USING (true);

CREATE POLICY contacts_select_all ON public.contacts FOR SELECT USING (true);
CREATE POLICY contacts_insert_all ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY contacts_update_all ON public.contacts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY contacts_delete_all ON public.contacts FOR DELETE USING (true);

CREATE POLICY activity_links_select_all ON public.activity_links FOR SELECT USING (true);
CREATE POLICY activity_links_insert_all ON public.activity_links FOR INSERT WITH CHECK (true);
CREATE POLICY activity_links_update_all ON public.activity_links FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY activity_links_delete_all ON public.activity_links FOR DELETE USING (true);

CREATE POLICY relatorios_cientificos_select_all ON public.relatorios_cientificos FOR SELECT USING (true);
CREATE POLICY relatorios_cientificos_insert_all ON public.relatorios_cientificos FOR INSERT WITH CHECK (true);
CREATE POLICY relatorios_cientificos_update_all ON public.relatorios_cientificos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY relatorios_cientificos_delete_all ON public.relatorios_cientificos FOR DELETE USING (true);

-- Note: These RLS policies are intentionally permissive to preserve current app behavior.
-- Future hardening can tighten rules using auth.uid() or role checks.
-- Note: Run this SQL in Supabase SQL editor or via psql. Requires the "pgcrypto" extension for gen_random_uuid(); if unavailable, use uuid_generate_v4() or SERIAL.
