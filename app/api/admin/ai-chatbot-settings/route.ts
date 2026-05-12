import { mapRouteError, ok } from "@/lib/server/http";
import { AI_CHATBOT_SETTINGS_ROW_ID, getAiChatbotSettings, normalizeAiChatbotInput } from "@/lib/server/ai-chatbot";
import { requireMasterUser } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const settings = await getAiChatbotSettings(supabase, { allowMissingTable: true });

    return ok({ success: true, settings });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireMasterUser(request);
    const input = normalizeAiChatbotInput(await request.json().catch(() => ({})));
    const updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("ai_chatbot_settings")
      .upsert(
        {
          id: AI_CHATBOT_SETTINGS_ROW_ID,
          enabled: input.enabled,
          config: input,
          updated_by: user.id,
          updated_at: updatedAt,
        },
        { onConflict: "id" }
      )
      .select("id, enabled, config, updated_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      success: true,
      settings: {
        id: data.id,
        ...input,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
