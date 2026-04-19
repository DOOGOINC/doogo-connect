import { CATALOG_IMAGE_BUCKET } from "@/lib/storage";
import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, getOwnedManufacturerId, requireServerUser } from "@/lib/server/supabase";

async function ensureCatalogBucket() {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) return;

  const { data: bucket, error: bucketError } = await serviceClient.storage.getBucket(CATALOG_IMAGE_BUCKET);
  if (!bucketError && bucket) {
    if (!bucket.public) {
      const { error: updateError } = await serviceClient.storage.updateBucket(CATALOG_IMAGE_BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
      });

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return;
  }

  const { error: createError } = await serviceClient.storage.createBucket(CATALOG_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
  });

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireServerUser(request);
    const uploadClient = createServiceRoleClient();
    if (!uploadClient) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for catalog image upload.");
    }
    await ensureCatalogBucket();
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

    const ext = (file.name.includes(".") ? file.name.split(".").pop() : "png") || "png";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const filePath = `${manufacturer.id}/${entity}/${entityId}/${Date.now()}-${safeName || "image"}.${ext}`;

    const { error } = await uploadClient.storage.from(CATALOG_IMAGE_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

    if (error) {
      throw new Error(error.message);
    }

    return ok({ path: filePath });
  } catch (error) {
    console.error("[catalog image upload]", error);
    return mapRouteError(error);
  }
}
