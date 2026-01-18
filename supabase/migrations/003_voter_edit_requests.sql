-- Voter edit requests table for approval workflow
-- Candidates submit edit requests, admins approve/reject them

CREATE TABLE IF NOT EXISTS voter_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  field_name text NOT NULL CHECK (field_name IN ('phone', 'present_location')),
  old_value text,
  new_value text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp DEFAULT now(),
  reviewed_at timestamp,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_voter_edit_requests_status ON voter_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_voter_edit_requests_candidate ON voter_edit_requests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_voter_edit_requests_voter ON voter_edit_requests(voter_id);

-- Enable Row Level Security
ALTER TABLE voter_edit_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Candidates can view their own requests
CREATE POLICY "Candidates can view their own edit requests"
ON voter_edit_requests
FOR SELECT
USING (
  candidate_id IN (
    SELECT id FROM candidates WHERE user_id = auth.uid()
  )
);

-- Policy: Candidates can insert their own requests
CREATE POLICY "Candidates can create edit requests"
ON voter_edit_requests
FOR INSERT
WITH CHECK (
  candidate_id IN (
    SELECT id FROM candidates WHERE user_id = auth.uid()
  )
);

-- Policy: Admins can view all requests (via service role, bypasses RLS)
-- Policy: Admins can update requests (via service role, bypasses RLS)
