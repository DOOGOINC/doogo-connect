export const CHAT_FILE_BUCKET = "chat-files";
export const CATALOG_IMAGE_BUCKET = "catalog-assets";
export const PARTNER_REQUEST_BUCKET = "partner-requests";
export const MANUFACTURER_ASSET_BUCKET = "manufacturers";

export const isExternalUrl = (value: string | null | undefined) => {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
};

export const buildStorageObjectUrl = (bucket: string, pathOrUrl: string | null | undefined) => {
  if (!pathOrUrl) return "";
  if (isExternalUrl(pathOrUrl)) return pathOrUrl;

  const params = new URLSearchParams({
    bucket,
    path: pathOrUrl,
  });

  return `/api/storage/object?${params.toString()}`;
};

export const buildPublicStorageUrl = (bucket: string, pathOrUrl: string | null | undefined) => {
  if (!pathOrUrl) return "";
  if (isExternalUrl(pathOrUrl)) return pathOrUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return "";

  const normalizedBaseUrl = supabaseUrl.replace(/\/$/, "");
  const encodedPath = pathOrUrl
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
};
