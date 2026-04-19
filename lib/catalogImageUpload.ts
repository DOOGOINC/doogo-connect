import { buildPublicStorageUrl, CATALOG_IMAGE_BUCKET } from "@/lib/storage";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

type UploadCatalogImageParams = {
  file: File;
  manufacturerId: number;
  entity: "products" | "containers";
  entityId: string;
};

const normalizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export function validateCatalogImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("이미지는 5MB 이하만 업로드할 수 있습니다.");
  }
}

export async function uploadCatalogImage({
  file,
  entity,
  entityId,
}: UploadCatalogImageParams) {
  validateCatalogImage(file);
  const safeName = normalizeFileName(file.name.replace(/\.[^/.]+$/, "")) || "image";
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const normalizedFile = new File([file], `${safeName}.${ext}`, {
    type: file.type,
  });
  const formData = new FormData();
  formData.append("file", normalizedFile);
  formData.append("entity", entity);
  formData.append("entityId", entityId);

  const response = await fetch("/api/catalog/images", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const payload = (await response.json()) as { error?: string; path?: string };

  if (!response.ok || !payload.path) {
    throw new Error(payload.error || "이미지 업로드에 실패했습니다.");
  }

  return payload.path;
}

export { CATALOG_IMAGE_BUCKET };
export const getCatalogImageUrl = (pathOrUrl: string | null | undefined) =>
  buildPublicStorageUrl(CATALOG_IMAGE_BUCKET, pathOrUrl);
