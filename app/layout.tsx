import type { Metadata } from "next";
import { ProfileCompletionGate } from "@/components/auth/ProfileCompletionGate";
import { SiteFooter } from "@/components/footer/site-footer";
import { SiteHeader } from "@/components/header/site-header";
import { SessionTimeout } from "@/components/SessionTimeout";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOGO CONNECT | 제조 연결 플랫폼",
  description: "견적 의뢰부터 제조사 연결까지, 더 빠르고 정확한 제조 매칭 플랫폼입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="antialiased">
      <body className="min-h-screen bg-[#f9fafb] text-[#191f28]">
        <SessionTimeout />
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
