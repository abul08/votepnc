# Maldives Local Council Voter DB

Secure, mobile-first voter database for Maldivian local council campaigns. Built with Next.js App Router and Supabase.

## Setup

**📖 For detailed setup instructions, see [SETUP.md](./SETUP.md)**

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Edit `.env.local` and replace the placeholder values with your actual Supabase credentials:
   - Get your credentials from: https://supabase.com/dashboard/project/_/settings/api
   - **Important:** Replace ALL placeholder values (`your-project-url-here`, `your-anon-key-here`, etc.)
   - Make sure your URL starts with `https://` (e.g., `https://xxxxx.supabase.co`)

3. **Set up the database:**
   
   Run `supabase/migrations/001_init.sql` in your Supabase SQL Editor

4. **Create your first admin user** (see SETUP.md for details)

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

**⚠️ Common Error:** If you see "Please replace the placeholder values", make sure you've updated `.env.local` with your actual Supabase credentials and restarted the dev server.

## Features

- Admin dashboard with full CRUD for users, candidates, and voters
- Candidate portal with field-level permissions via Admin control
- CSV import for voter lists
- Activity log for sign-ins and audit trails
- Supabase RLS policies for strict role-based access

## Supabase Notes

- Admin user creation uses the service role key to create auth users.
- Candidates should access voters via assigned permissions and RLS-protected queries.
