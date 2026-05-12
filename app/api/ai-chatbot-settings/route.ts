import { mapRouteError, ok } from "@/lib/server/http";
import { getAiChatbotSettings, toPublicAiChatbotSettings } from "@/lib/server/ai-chatbot";
import { createServiceRoleClient } from "@/lib/server/supabase";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const admin = createServiceRoleClient();
    const supabase = admin ?? (await createClient());
    const settings = await getAiChatbotSettings(supabase, { allowMissingTable: true });

    return ok({ success: true, settings: toPublicAiChatbotSettings(settings) });
  } catch (error) {
    return mapRouteError(error);
  }
}
