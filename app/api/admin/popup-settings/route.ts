import { mapRouteError, ok } from "@/lib/server/http";
import { getPopupSettings, normalizePopupInput, POPUP_SETTINGS_ROW_ID } from "@/lib/server/popup-settings";
import { requireMasterUser } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const settings = await getPopupSettings(supabase, { allowMissingTable: true });

    return ok({ success: true, settings });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireMasterUser(request);
    const input = normalizePopupInput(await request.json().catch(() => ({})));
    const updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("platform_popup_settings")
      .upsert(
        {
          id: POPUP_SETTINGS_ROW_ID,
          enabled: input.enabled,
          title: input.title,
          content: input.content,
          feature_title: input.featureTitle,
          feature_description: input.featureDescription,
          event_title: input.eventTitle,
          event_description: input.eventDescription,
          button_label: input.buttonLabel,
          button_url: input.buttonUrl,
          updated_by: user.id,
          updated_at: updatedAt,
        },
        { onConflict: "id" }
      )
      .select("id, enabled, title, content, feature_title, feature_description, event_title, event_description, button_label, button_url, updated_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return ok({
      success: true,
      settings: {
        id: data.id,
        enabled: Boolean(data.enabled),
        title: data.title,
        content: data.content,
        featureTitle: data.feature_title,
        featureDescription: data.feature_description,
        eventTitle: data.event_title,
        eventDescription: data.event_description,
        buttonLabel: data.button_label,
        buttonUrl: data.button_url,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return mapRouteError(error);
  }
}
