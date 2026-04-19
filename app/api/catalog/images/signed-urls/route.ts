import { buildPublicStorageUrl, CATALOG_IMAGE_BUCKET, isExternalUrl } from "@/lib/storage";
import { mapRouteError, ok } from "@/lib/server/http";
import { createServiceRoleClient, requireServerUser } from "@/lib/server/supabase";

async function ensureCatalogBucketPublic() {
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
    await requireServerUser(request);
    await ensureCatalogBucketPublic();
    const payload = (await request.json()) as { paths?: unknown };
    const rawPaths = Array.isArray(payload?.paths) ? payload.paths : [];

    const paths = Array.from(
      new Set(
        rawPaths
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value && !isExternalUrl(value))
      )
    );

    if (paths.length === 0) {
      return ok({ urls: {} });
    }

    const urls = Object.fromEntries(paths.map((path) => [path, buildPublicStorageUrl(CATALOG_IMAGE_BUCKET, path)]));

    return ok({ urls });
  } catch (error) {
    console.error("[catalog image signed urls]", error);
    return mapRouteError(error);
  }
}
