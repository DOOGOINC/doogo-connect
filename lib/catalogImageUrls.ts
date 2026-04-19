"use client";

import { authFetch } from "@/lib/client/auth-fetch";
import { buildPublicStorageUrl, CATALOG_IMAGE_BUCKET, isExternalUrl } from "@/lib/storage";

type PublicUrlResponse = {
  urls?: Record<string, string>;
  error?: string;
};

export function collectCatalogImagePaths(paths: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      paths
        .map((path) => path?.trim())
        .filter((path): path is string => Boolean(path) && !isExternalUrl(path))
    )
  );
}

export async function fetchCatalogSignedUrls(paths: string[]) {
  const uniquePaths = collectCatalogImagePaths(paths);
  if (uniquePaths.length === 0) {
    return {} as Record<string, string>;
  }

  const response = await authFetch("/api/catalog/images/signed-urls", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paths: uniquePaths }),
  });

  const payload = (await response.json()) as PublicUrlResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Failed to prepare public image URLs.");
  }

  return payload.urls || Object.fromEntries(uniquePaths.map((path) => [path, buildPublicStorageUrl(CATALOG_IMAGE_BUCKET, path)]));
}

export function resolveCatalogImageUrl(pathOrUrl: string | null | undefined, signedUrls: Record<string, string>) {
  if (!pathOrUrl) return "";
  if (isExternalUrl(pathOrUrl)) return pathOrUrl;
  return signedUrls[pathOrUrl] || "";
}
