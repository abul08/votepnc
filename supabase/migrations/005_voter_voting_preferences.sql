-- Create table to track which voters will vote for which candidates
CREATE TABLE IF NOT EXISTS voter_voting_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES voters(id) ON DELETE CASCADE,
  will_vote BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, voter_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_voter_voting_preferences_candidate ON voter_voting_preferences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_voter_voting_preferences_voter ON voter_voting_preferences(voter_id);

-- Enable RLS
ALTER TABLE voter_voting_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Candidates can view and update their own voting preferences
CREATE POLICY "Candidates can view their voting preferences"
  ON voter_voting_preferences
  FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM candidates 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can insert their voting preferences"
  ON voter_voting_preferences
  FOR INSERT
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM candidates 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can update their voting preferences"
  ON voter_voting_preferences
  FOR UPDATE
  USING (
    candidate_id IN (
      SELECT id FROM candidates 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view all voting preferences
CREATE POLICY "Admins can view all voting preferences"
  ON voter_voting_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_voter_voting_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_voter_voting_preferences_updated_at
  BEFORE UPDATE ON voter_voting_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_voter_voting_preferences_updated_at();
