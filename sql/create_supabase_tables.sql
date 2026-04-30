-- Supabase / Postgres schema for Paia activities

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

-- Note: Run this SQL in Supabase SQL editor or via psql. Requires the "pgcrypto" extension for gen_random_uuid(); if unavailable, use uuid_generate_v4() or SERIAL.
