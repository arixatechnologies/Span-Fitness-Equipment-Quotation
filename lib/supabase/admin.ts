import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/env";

export function getSupabaseConfigIssue() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl) {
    return "SUPABASE_URL is missing in .env.";
  }

  if (supabaseUrl.includes("your-project.supabase.co")) {
    return "SUPABASE_URL still has the placeholder value.";
  }

  try {
    const url = new URL(supabaseUrl);
    if (!url.hostname.endsWith(".supabase.co")) {
      return "SUPABASE_URL should look like https://your-project-ref.supabase.co.";
    }
  } catch {
    return "SUPABASE_URL is not a valid URL.";
  }

  if (!serviceRoleKey) {
    return "SUPABASE_SERVICE_ROLE_KEY is missing in .env.";
  }

  if (serviceRoleKey === "your-service-role-key") {
    return "SUPABASE_SERVICE_ROLE_KEY still has the placeholder value.";
  }

  return null;
}

export function createSupabaseAdminClient() {
  const issue = getSupabaseConfigIssue();

  if (issue) {
    throw new Error(`Supabase is not configured: ${issue}`);
  }

  return createClient(
    getRequiredEnv("SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
