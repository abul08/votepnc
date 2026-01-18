-- Add candidate_number field to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS candidate_number text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_candidates_number ON candidates(candidate_number);
