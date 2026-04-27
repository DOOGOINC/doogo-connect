import KakaoReferralPageClient from "./KakaoReferralPageClient";

type KakaoReferralPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") ? next : "/";
}

export default async function KakaoReferralPage({ searchParams }: KakaoReferralPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);

  return <KakaoReferralPageClient nextPath={nextPath} />;
}
