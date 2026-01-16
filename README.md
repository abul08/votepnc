# Maldives Local Council Voter DB

Secure, mobile-first voter database for Maldivian local council campaigns. Built with Next.js App Router and Supabase.

## Setup

1. Create a Supabase project and set the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. Run the SQL migration in `supabase/migrations/001_init.sql` from the Supabase SQL editor.

3. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to access the app.

## Features

- Admin dashboard with full CRUD for users, candidates, and voters
- Candidate portal with field-level permissions via Admin control
- CSV import for voter lists
- Activity log for sign-ins and audit trails
- Supabase RLS policies for strict role-based access

## Supabase Notes

- Admin user creation uses the service role key to create auth users.
- Candidates should access voters via assigned permissions and RLS-protected queries.
