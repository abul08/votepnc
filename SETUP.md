# Setup Guide

## Quick Start

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or select an existing one)
3. Navigate to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...` - keep this secret!)

### 2. Configure Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- Make sure the URL starts with `https://` (or `http://` for local development)
- Don't include quotes around the values
- Don't leave any spaces around the `=` sign
- The service_role key should NEVER be exposed to the client (it's only used server-side)

### 3. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/migrations/001_init.sql`
3. Copy all the SQL code
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

This will create all the necessary tables, policies, and functions.

### 4. Create Your First Admin User

After running the migration, you need to create an admin user:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add user** → **Create new user**
3. Enter an email and password
4. Copy the user's **UUID** (from the users list)
5. Go to **SQL Editor** and run:

```sql
INSERT INTO public.users (id, username, role)
VALUES ('<paste-user-uuid-here>', '<user-email>', 'admin');
```

Replace `<paste-user-uuid-here>` with the UUID you copied, and `<user-email>` with the email you used.

### 5. Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and log in with your admin credentials!

## Troubleshooting

### "Invalid supabaseUrl" Error

- Make sure your URL starts with `https://` or `http://`
- Check for typos in the URL
- Ensure there are no extra spaces or quotes

### "Please replace the placeholder values" Error

- Open `.env.local` and verify you've replaced all placeholder text
- Make sure you're using actual values from your Supabase dashboard
- Restart your dev server after making changes

### Environment Variables Not Loading

- Make sure the file is named exactly `.env.local` (not `.env.local.txt`)
- Restart your dev server after editing `.env.local`
- Check that variables start with `NEXT_PUBLIC_` for client-side access

### Database Connection Issues

- Verify you've run the migration SQL script
- Check that your Supabase project is active (not paused)
- Ensure your IP is allowed in Supabase network settings (if using IP restrictions)

## Next Steps

- Import voter data via CSV in the Admin dashboard
- Create candidate users and assign permissions
- Configure field-level permissions for candidates
