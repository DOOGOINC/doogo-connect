import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

type BanAction = "7d" | "30d" | "permanent";
type MemberBanAction = BanAction | "unban";

function getBanPatch(action: BanAction) {
  const now = new Date();

  if (action === "permanent") {
    return {
      ban_type: "permanent",
      ban_expires_at: null,
      ban_updated_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  const next = new Date(now);
  next.setDate(now.getDate() + (action === "7d" ? 7 : 30));

  return {
    ban_type: "temporary",
    ban_expires_at: next.toISOString(),
    ban_updated_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

function getUnbanPatch() {
  const now = new Date();

  return {
    ban_type: "none",
    ban_expires_at: null,
    ban_updated_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireMasterUser(request);
    const { id } = await context.params;

    const body = await request.json();
    const action = typeof body.action === "string" ? (body.action as MemberBanAction) : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!id) {
      throw new Error("Member ID is required.");
    }

    if (action !== "7d" && action !== "30d" && action !== "permanent" && action !== "unban") {
      throw new Error("Invalid ban action.");
    }

    if (action !== "unban" && !reason) {
      throw new Error("Ban reason is required.");
    }

    const { data: member, error: memberError } = await supabase.from("profiles").select("id, role").eq("id", id).maybeSingle();
    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!member) {
      throw new Error("Member not found.");
    }

    if (member.role === "master") {
      throw new Error("Master accounts cannot be sanctioned here.");
    }

    if (action !== "unban" && member.role !== "member") {
      throw new Error("Only requester accounts can be sanctioned here.");
    }

    const patch = action === "unban" ? getUnbanPatch() : getBanPatch(action);
    const updateWithReason = await supabase
      .from("profiles")
      .update({
        ...patch,
        ban_reason: action === "unban" ? null : reason,
      })
      .eq("id", id)
      .select("id, ban_type, ban_expires_at, ban_reason")
      .maybeSingle();

    if (!updateWithReason.error) {
      return ok({
        success: true,
        member: updateWithReason.data,
      });
    }

    if (!updateWithReason.error.message.includes("ban_reason")) {
      throw new Error(updateWithReason.error.message);
    }

    const fallbackUpdate = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("id, ban_type, ban_expires_at")
      .maybeSingle();

    if (fallbackUpdate.error) {
      throw new Error(fallbackUpdate.error.message);
    }

    return ok({
      success: true,
      member: {
        ...fallbackUpdate.data,
        ban_reason: null,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
