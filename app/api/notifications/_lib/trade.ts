import { createServiceRoleClient } from "@/lib/server/supabase";
import type { NotificationSupabase } from "./utils";
import { buildManufacturerTradeNotifications } from "./trade-manufacturer";
import { buildMasterTradeNotifications } from "./trade-master";
import { buildMemberTradeNotifications } from "./trade-member";
import { buildPartnerTradeNotifications } from "./trade-partner";

export async function buildTradeNotifications(supabase: NotificationSupabase, userId: string, role: string, readKeys: Set<string>) {
  const admin = createServiceRoleClient();

  if (role === "manufacturer") {
    return buildManufacturerTradeNotifications(supabase, userId, readKeys);
  }

  if (role === "master" && admin) {
    return buildMasterTradeNotifications(admin, readKeys);
  }

  if (role === "partner" && admin) {
    return buildPartnerTradeNotifications(admin, userId, readKeys);
  }

  return buildMemberTradeNotifications(supabase, userId, readKeys);
}
