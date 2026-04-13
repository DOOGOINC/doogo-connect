import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/header/site-header";
import { SiteFooter } from "@/components/footer/site-footer";
import { SessionTimeout } from "@/components/SessionTimeout";

export const metadata: Metadata = {
  title: "DOGO CONNECT | 두고 커넥트",
  description: "견적부터 제조까지, 가장 단순한 제조 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="antialiased">
      <body className="min-h-screen bg-[#f9fafb] text-[#191f28] ">
        <SessionTimeout />
        {/* 모든 페이지 공통 헤더 */}
        <div className="print:hidden">
          <SiteHeader />
        </div>
        
        {/* 페이지 본문 */}
        {children}
        
        {/* 모든 페이지 공통 푸터 (필요 시 추가) */}
        <div className="print:hidden">
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}