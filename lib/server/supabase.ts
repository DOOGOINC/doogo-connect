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

function getImpersonationUserId(request?: Request) {
  const value = request?.headers.get("x-impersonate-user-id") || request?.headers.get("X-Impersonate-User-Id");
  const trimmed = value?.trim() || "";
  if (trimmed) {
    return trimmed;
  }

  if (!request) return null;

  const searchValue = new URL(request.url).searchParams.get("impersonate")?.trim() || "";
  return searchValue || null;
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
    data: { user: actorUser },
    error,
  } = await supabase.auth.getUser(token || undefined);

  if (error || !actorUser) {
    throw new Error("UNAUTHORIZED");
  }

  const impersonationUserId = getImpersonationUserId(request);
  if (!impersonationUserId || impersonationUserId === actorUser.id) {
    return {
      supabase,
      user: actorUser,
      actorUser,
      isImpersonating: false,
      impersonatedUserId: null,
    };
  }

  const actorRole = await getProfileRole(supabase, actorUser.id);
  if (actorRole !== "master") {
    throw new Error("FORBIDDEN");
  }

  const { data: impersonatedProfile, error: impersonatedProfileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, phone_number")
    .eq("id", impersonationUserId)
    .maybeSingle<{
      id: string;
      role: AppRole | null;
      full_name: string | null;
      email: string | null;
      phone_number: string | null;
    }>();

  if (impersonatedProfileError) {
    throw new Error(impersonatedProfileError.message);
  }

  if (!impersonatedProfile?.id || impersonatedProfile.role !== "member") {
    throw new Error("FORBIDDEN");
  }

  const effectiveUser = {
    ...actorUser,
    id: impersonatedProfile.id,
    email: impersonatedProfile.email?.trim() || actorUser.email,
    phone: impersonatedProfile.phone_number?.trim() || actorUser.phone,
    user_metadata: {
      ...actorUser.user_metadata,
      full_name: impersonatedProfile.full_name?.trim() || actorUser.user_metadata?.full_name || actorUser.user_metadata?.name,
      name: impersonatedProfile.full_name?.trim() || actorUser.user_metadata?.name,
      phone_number: impersonatedProfile.phone_number?.trim() || actorUser.user_metadata?.phone_number,
      role: impersonatedProfile.role,
    },
    app_metadata: {
      ...actorUser.app_metadata,
      role: impersonatedProfile.role,
    },
  } satisfies User;

  return {
    supabase,
    user: effectiveUser,
    actorUser,
    isImpersonating: true,
    impersonatedUserId: impersonatedProfile.id,
  };
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
