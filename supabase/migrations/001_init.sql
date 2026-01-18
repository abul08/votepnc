-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'candidate');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  role user_role NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Voters table
CREATE TABLE public.voters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sumaaru TEXT NOT NULL, -- Official voter list order number from Elections Commission
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  sex TEXT,
  nid TEXT, -- National ID
  present_location TEXT,
  registered_box TEXT,
  job_in TEXT,
  job_by TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Candidate permissions table (for field-level access control)
CREATE TABLE public.candidate_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  allowed_fields TEXT[] NOT NULL DEFAULT '{}', -- Array of field names candidate can edit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id)
);

-- Voter assignments table (assigns voters to candidates)
CREATE TABLE public.voter_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_id UUID NOT NULL REFERENCES public.voters(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(voter_id, candidate_id)
);

-- Indexes for performance
CREATE INDEX idx_voters_sumaaru ON public.voters(sumaaru);
CREATE INDEX idx_voters_created_by ON public.voters(created_by);
CREATE INDEX idx_voters_updated_by ON public.voters(updated_by);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_timestamp ON public.activity_log(timestamp DESC);
CREATE INDEX idx_candidates_user_id ON public.candidates(user_id);
CREATE INDEX idx_voter_assignments_voter_id ON public.voter_assignments(voter_id);
CREATE INDEX idx_voter_assignments_candidate_id ON public.voter_assignments(candidate_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on voters
CREATE TRIGGER update_voters_updated_at
  BEFORE UPDATE ON public.voters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voter_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own record"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- RLS Policies for candidates table
CREATE POLICY "Admins have full access to candidates"
  ON public.candidates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Candidates can view their own record"
  ON public.candidates FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for voters table
CREATE POLICY "Admins have full access to voters"
  ON public.voters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to get voters assigned to a candidate
CREATE OR REPLACE FUNCTION get_candidate_voters(candidate_user_id UUID)
RETURNS TABLE (
  id UUID,
  sumaaru TEXT,
  name TEXT,
  address TEXT,
  phone TEXT,
  sex TEXT,
  nid TEXT,
  present_location TEXT,
  registered_box TEXT,
  job_in TEXT,
  job_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- For now, candidates can see all voters they created
  -- Admin can configure assignments via candidate_permissions if needed
  RETURN QUERY
  SELECT v.id, v.sumaaru, v.name, v.address, v.phone, v.sex, v.nid,
         v.present_location, v.registered_box, v.job_in, v.job_by,
         v.created_at, v.updated_at
  FROM public.voters v
  WHERE v.created_by = candidate_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update voter fields (with permission check)
CREATE OR REPLACE FUNCTION update_candidate_voter(
  voter_id UUID,
  candidate_user_id UUID,
  updates JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  perm_fields TEXT[];
  update_fields JSONB := '{}'::jsonb;
  key TEXT;
BEGIN
  -- Get allowed fields for this candidate
  SELECT allowed_fields INTO perm_fields
  FROM public.candidate_permissions cp
  JOIN public.candidates c ON c.id = cp.candidate_id
  WHERE c.user_id = candidate_user_id;

  -- If no permissions set, allow all fields (admin can restrict later)
  IF perm_fields IS NULL OR array_length(perm_fields, 1) IS NULL THEN
    -- Allow update if candidate created this voter
    IF EXISTS (
      SELECT 1 FROM public.voters
      WHERE id = voter_id AND created_by = candidate_user_id
    ) THEN
      UPDATE public.voters
      SET
        name = COALESCE((updates->>'name')::TEXT, name),
        address = COALESCE((updates->>'address')::TEXT, address),
        phone = COALESCE((updates->>'phone')::TEXT, phone),
        present_location = COALESCE((updates->>'present_location')::TEXT, present_location),
        updated_by = candidate_user_id
      WHERE id = voter_id;
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;

  -- Filter updates to only allowed fields
  FOR key IN SELECT jsonb_object_keys(updates) LOOP
    IF key = ANY(perm_fields) THEN
      update_fields := update_fields || jsonb_build_object(key, updates->key);
    END IF;
  END LOOP;

  -- Apply filtered updates
  IF jsonb_object_keys(update_fields) IS NOT NULL THEN
    UPDATE public.voters
    SET
      name = COALESCE((update_fields->>'name')::TEXT, name),
      address = COALESCE((update_fields->>'address')::TEXT, address),
      phone = COALESCE((update_fields->>'phone')::TEXT, phone),
      present_location = COALESCE((update_fields->>'present_location')::TEXT, present_location),
      updated_by = candidate_user_id
    WHERE id = voter_id AND created_by = candidate_user_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Candidates can view voters via function
CREATE POLICY "Candidates can view assigned voters via function"
  ON public.voters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'candidate'
    ) AND created_by = auth.uid()
  );

-- RLS Policies for activity_log table
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own activity logs"
  ON public.activity_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert activity logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for candidate_permissions table
CREATE POLICY "Admins have full access to candidate_permissions"
  ON public.candidate_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for voter_assignments table
CREATE POLICY "Admins have full access to voter_assignments"
  ON public.voter_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Candidates can view their own assignments"
  ON public.voter_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = voter_assignments.candidate_id
      AND c.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
