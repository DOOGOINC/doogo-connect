import { Suspense } from "react";
import type { Metadata } from "next";
import { ReferralTracker } from "@/components/ReferralTracker";
import { ProfileCompletionGate } from "@/components/auth/ProfileCompletionGate";
import { SiteFooter } from "@/components/footer/site-footer";
import { SiteHeader } from "@/components/header/site-header";
import { SessionTimeout } from "@/components/SessionTimeout";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://doogoconnect.com"),

  title: {
    default: "두고커넥트 | 건강식품 OEM 실시간 견적 조회",
    template: "%s | DOOGO CONNECT",
  },

  description: "국내 및 해외 제조사 견적 실시간 비교 소량 생산부터 대량 OEM까지 간편하게 연결",

  keywords: [
    "제조 플랫폼",
    "OEM",
    "ODM",
    "제조사 연결",
    "공장 매칭",
    "견적 의뢰",
    "제조 파트너",
    "DOGO CONNECT",
  ],

  openGraph: {
    title: "두고커넥트 | 건강식품 OEM 실시간 견적 조회",

    description:
      "국내 및 해외 제조사 견적 실시간 비교 소량 생산부터 대량 OEM까지 간편하게 연결",

    url: "https://doogoconnect.com",

    siteName: "DOOGO CONNECT",

    locale: "ko_KR",

    type: "website",

    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "DOOGO CONNECT",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "두고커넥트 | 건강식품 OEM 실시간 견적 조회",

    description:
      "국내 및 해외 제조사 견적 실시간 비교 소량 생산부터 대량 OEM까지 간편하게 연결",

    images: ["/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="">
        <SessionTimeout />

        <Suspense fallback={null}>
          <ReferralTracker />
        </Suspense>

        <ProfileCompletionGate />

        <div className="print:hidden">
          <SiteHeader />
        </div>

        {children}

        <div className="print:hidden">
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}