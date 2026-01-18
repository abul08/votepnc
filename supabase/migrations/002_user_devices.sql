-- User devices table for per-device login tracking
-- Stores hashed refresh tokens (never raw tokens)

CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  device_name text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_token_hash ON user_devices(refresh_token_hash);

-- Enable Row Level Security
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view and delete their own devices
CREATE POLICY "Users can view their own devices"
ON user_devices
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices"
ON user_devices
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Allow insert via service role (API routes use admin client)
-- Regular users cannot insert directly - must go through API
CREATE POLICY "Service role can insert devices"
ON user_devices
FOR INSERT
WITH CHECK (true);
