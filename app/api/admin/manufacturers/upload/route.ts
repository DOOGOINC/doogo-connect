import { MANUFACTURER_ASSET_BUCKET } from "@/lib/storage";
import { mapRouteError, ok } from "@/lib/server/http";
import { requireMasterUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireMasterUser(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const assetType = formData.get("assetType");

    if (!(file instanceof File) || !file.size) {
      throw new Error("업로드할 파일이 없습니다.");
    }

    if (assetType !== "image" && assetType !== "logo") {
      throw new Error("자산 유형이 올바르지 않습니다.");
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const fileName = `${assetType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(MANUFACTURER_ASSET_BUCKET).upload(fileName, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(MANUFACTURER_ASSET_BUCKET).getPublicUrl(fileName);

    return ok({ publicUrl, path: fileName });
  } catch (error) {
    return mapRouteError(error);
  }
}
