import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth/roles";
import { createClient as createServerCookieClient } from "@/utils/supabase/server";

function createBearerClient(token: string) {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function getBearerToken(request?: Request) {
  const header = request?.headers.get("authorization") || request?.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function requireServerUser(request?: Request) {
  const token = getBearerToken(request);
  const supabase = token ? createBearerClient(token) : await createServerCookieClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token || undefined);

  if (error || !user) {
    throw new Error("UNAUTHORIZED");
  }

  return { supabase, user };
}

export async function getProfileRole(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return (data?.role as AppRole | null) || "member";
}

export async function getOwnedManufacturerId(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase.from("manufacturers").select("id, name").eq("owner_id", userId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data?.id ?? null,
    name: data?.name ?? "",
  };
}

export async function userOwnsManufacturer(
  supabase: SupabaseClient,
  userId: string,
  manufacturerId: number
) {
  const { data, error } = await supabase
    .from("manufacturers")
    .select("id")
    .eq("id", manufacturerId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function requireMasterUser(request?: Request) {
  return requireRoleUser(["master"], request);
}

export async function requirePartnerUser(request?: Request) {
  return requireRoleUser(["partner"], request);
}

export async function requireRoleUser(allowedRoles: AppRole[], request?: Request) {
  const { supabase, user } = await requireServerUser(request);
  const role = await getProfileRole(supabase, user.id);

  if (!allowedRoles.includes(role)) {
    throw new Error("FORBIDDEN");
  }

  return { supabase, user, role };
}

export function isAuthError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN";
}

export function assertUser(user: User | null | undefined): asserts user is User {
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
}
