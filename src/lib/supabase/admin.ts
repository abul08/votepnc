import { createClient } from "@supabase/supabase-js";

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

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const { url, key } = validateSupabaseConfig(supabaseUrl, serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
