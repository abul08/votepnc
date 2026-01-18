import { cookies } from "next/headers";

import { createServerClient, type CookieOptions } from "@supabase/ssr";

function validateSupabaseConfig(url: string | undefined, key: string | undefined, keyName: string) {
  if (!url || !key) {
    throw new Error(
      `Missing Supabase environment variables. Please configure NEXT_PUBLIC_SUPABASE_URL and ${keyName} in .env.local`
    );
  }

  // Check for placeholder values
  if (
    url === "your-project-url-here" ||
    key === "your-anon-key-here" ||
    key === "your-service-role-key-here" ||
    url.includes("your-project") ||
    key.includes("your-")
  ) {
    throw new Error(
      `Please replace the placeholder values in .env.local with your actual Supabase credentials. Get them from: https://supabase.com/dashboard/project/_/settings/api`
    );
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new Error("URL must use http:// or https:// protocol");
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Invalid Supabase URL format. Expected a valid HTTP/HTTPS URL, got: ${url}. Please check your NEXT_PUBLIC_SUPABASE_URL in .env.local`
      );
    }
    throw error;
  }

  return { url, key };
}

export async function createSupabaseServerClient() {
  // Await cookies() first - Next.js 16 requires this
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { url, key } = validateSupabaseConfig(supabaseUrl, supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Create a cookie handler that works with Next.js 16
  // Use getAll() and setAll() as recommended by Supabase SSR
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll is called from Server Components where cookies cannot be set
          // This is expected - the proxy handles cookie setting for auth
        }
      },
    },
  });
}
