"use client";

import Link from "next/link";
import Image from "next/image";

const companyLinks = [
  { label: "회사소개", href: "/about" },
  { label: "개인정보처리방침", href: "/privacy", bold: true },
  { label: "이용약관", href: "/terms" },
];

const serviceLinks = [
  { label: "제조 견적", href: "/estimate" },
  { label: "제조사 목록", href: "/manufacturers" },
  { label: "이용안내", href: "/guide" },
];

const supportLinks = [
  { label: "성공사례", href: "/success-stories" },
  { label: "고객센터", href: "/support" },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#0a1628] py-16 lg:py-20 text-[#8b95a1]">
      <div className="mx-auto max-w-7xl px-6">
        {/* 상단 섹션: 로고 및 메뉴 */}
        <div className="grid gap-x-8 gap-y-12 pb-16 grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-5 col-span-2 md:col-span-3 lg:col-span-1">
            <div className="w-fit">
              <Image
                src="/image/doogo_logo_full.png"
                alt="DOOGO CONNECT"
                width={160}
                height={34}
                className="object-contain brightness-0 invert"
              />
            </div>
            <div className="text-[14px] leading-relaxed">
              <p className="font-bold text-white text-[16px] mb-2">제조를 잇다, 두고커넥트</p>
              <p className="opacity-70">
                해외 건강식품 소량 OEM 제조를 위한<br className="hidden sm:block" />
                실시간 견적 플랫폼
              </p>
            </div>
          </div>

          {/* 카테고리 메뉴들 */}
          <nav className="flex flex-col gap-4">
            <p className="text-[13px] font-bold tracking-wider text-white">COMPANY</p>
            {companyLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`text-[14px] transition hover:text-white ${link.bold ? "font-bold text-white" : ""
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="flex flex-col gap-4">
            <p className="text-[13px] font-bold tracking-wider text-white">SERVICES</p>
            {serviceLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-[14px] transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="flex flex-col gap-4">
            <p className="text-[13px] font-bold tracking-wider text-white">SUPPORT</p>
            {supportLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-[14px] transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 하단 섹션: 사업자 정보 및 법적 고시 */}
        <div className="border-t border-[#2f3338] pt-10">
          <div className="flex flex-col lg:flex-row lg:justify-between gap-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
                <span className="font-bold text-white">(주)두고</span>
                <span className="text-[#2f3338]">|</span>
                <span>대표이사 문원오</span>
                <span className="hidden sm:inline text-[#2f3338]">|</span>
                <span>사업자등록번호: 726-87-03167</span>
                <span className="hidden md:inline text-[#2f3338]">|</span>
                <span>통신판매업신고: 제 2026-서울강남-XXXX 호</span>
              </div>
              <p className="text-[13px]">주소: 서울특별시 강남구 테헤란로</p>

              <div className="mt-8 space-y-2 text-[12px] leading-relaxed text-[#4e5968]">
                <p>
                  (주)두고는 통신판매중개자로서 통신판매의 당사자가 아니며, 입점 제조사가 등록한 상품 정보 및 거래에 대하여 책임을 지지 않습니다.
                </p>
                <p>© 2026 DOOGO Connect. All rights reserved.</p>
              </div>
            </div>

            {/* 우측 하단: 고객센터 정보 */}
            <div className="flex flex-col gap-2 shrink-0 lg:text-right">
              <p className="text-[14px] font-bold text-white">
                사업제휴 문의: <span className="text-[#3182f6] font-medium ml-1 text-[15px] break-all">doogobiz@gmail.com</span>
              </p>
              <p className="text-[12px] opacity-60 leading-relaxed">
                점심시간 1시-2시 제외<br className="lg:hidden" /> · 주말/공휴일 제외 · 평일 오전 10시~오후 6시
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
