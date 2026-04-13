import { CATALOG_IMAGE_BUCKET } from "@/lib/storage";
import { mapRouteError, ok } from "@/lib/server/http";
import { getOwnedManufacturerId, requireServerUser } from "@/lib/server/supabase";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireServerUser(request);
    const manufacturer = await getOwnedManufacturerId(supabase, user.id);
    if (!manufacturer.id) {
      throw new Error("연결된 제조사 계정이 없습니다.");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const entity = formData.get("entity");
    const entityId = String(formData.get("entityId") || "").trim();

    if (!(file instanceof File) || !file.size) {
      throw new Error("업로드할 이미지가 없습니다.");
    }

    if (entity !== "products" && entity !== "containers") {
      throw new Error("지원하지 않는 카탈로그 자산입니다.");
    }

    if (!entityId) {
      throw new Error("카탈로그 ID가 필요합니다.");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("이미지 파일만 업로드할 수 있습니다.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("이미지는 5MB 이하만 업로드할 수 있습니다.");
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
    const filePath = `${manufacturer.id}/${entity}/${entityId}/${Date.now()}-${safeName || "image"}.${ext}`;

    const { error } = await supabase.storage.from(CATALOG_IMAGE_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

    if (error) {
      throw new Error(error.message);
    }

    return ok({ path: filePath });
  } catch (error) {
    return mapRouteError(error);
  }
}
