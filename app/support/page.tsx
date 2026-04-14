"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MessageCircle, Mail, Phone, Clock, Send, ArrowRight } from "lucide-react";

const faqs = [
  {
    question: "최소 주문 수량(MOQ)은 얼마인가요?",
    answer: "최소 50개부터 주문 가능합니다. 제품 종류 및 수량에 따라 다를 수 있으며, 정확한 가이드는 문의 시 안내해 드립니다."
  },
  {
    question: "제조 기간은 얼마나 걸리나요?",
    answer: "일반적으로 주문 확정 후 약 3~4주가 소요됩니다. 제품의 복잡도와 수량에 따라 일정이 조정될 수 있습니다."
  },
  {
    question: "디자인 파일이 없어도 진행이 가능한가요?",
    answer: "네, 가능합니다. 두고커넥트의 디자인 팀이 로고 제작부터 패키지 디자인까지 지원해 드립니다."
  },
  {
    question: "해외 배송도 가능한가요?",
    answer: "네, 전 세계 주요 지역으로 배송이 가능합니다. 국가별 통관 절차 및 배송비는 별도로 안내해 드립니다."
  },
  {
    question: "해외 제조사인 경우 결제는 어떻게 하나요?",
    answer: "해외 제조사와의 거래 시 안전한 결제 시스템을 제공하며, 외화 송금 및 관련 서류 처리를 지원합니다."
  },
  {
    question: "견적 금액이 변동될 수 있나요?",
    answer: "원자재 가격 변동이나 환율 영향으로 인해 최종 견적은 상담 과정에서 확정됩니다."
  }
];

export default function SupportPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    content: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Inquiry submitted:", formData);
    alert("문의가 접수되었습니다. 곧 연락드리겠습니다.");
  };

  return (
    <main className="min-h-screen bg-white">
      {/* 1. Hero Section */}
      <section className="bg-gradient-to-r from-[#1b3e7a] to-[#235bd4] pt-24 pb-16 text-center text-white md:pt-32 md:pb-24">
        <div className="mx-auto max-w-[1000px] px-6">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-[11px] md:text-xs font-semibold backdrop-blur-sm">
            고객 지원
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight md:leading-tight">
            두고커넥트와 함께<br className="sm:hidden" /> 브랜드를 만드는 이야기
          </h1>
          <p className="mt-4 text-base sm:text-lg font-medium text-white/80 max-w-[700px] mx-auto">
            전 세계 12개국의 200개 이상의 건강식품 브랜드가 두고커넥트와 함께 시작했습니다.<br className="hidden md:block" />
            궁금한 점이 있으시면 언제든지 문의하세요.
          </p>

          {/* Floating Cards */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="flex flex-col items-center rounded-2xl bg-white/10 p-6 backdrop-blur-md transition-transform hover:scale-[1.02] border border-white/5">
              <Phone className="h-6 w-6 text-yellow-400" />
              <span className="mt-3 text-sm font-medium text-white/70">전화 문의</span>
              <span className="mt-1 text-lg font-bold text-white">+1 (800) DUGO-OEM</span>
              <span className="mt-1 text-xs text-white/50">평일 09:00~18:00</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white/10 p-6 backdrop-blur-md border border-white/20 transition-transform hover:scale-[1.02]">
              <Mail className="h-6 w-6 text-blue-300" />
              <span className="mt-3 text-sm font-medium text-white/70">이메일 문의</span>
              <span className="mt-1 text-lg font-bold text-white break-all">hello@dugo-connect.com</span>
              <span className="mt-1 text-xs text-white/50">24시간 접수 가능</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl bg-white/10 p-6 backdrop-blur-md transition-transform hover:scale-[1.02] border border-white/5 sm:col-span-2 md:col-span-1">
              <MessageCircle className="h-6 w-6 text-green-400" />
              <span className="mt-3 text-sm font-medium text-white/70">카카오톡 채널</span>
              <span className="mt-1 text-lg font-bold text-white">@두고커넥트</span>
              <span className="mt-1 text-xs text-white/50">평일 빠른 답변</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Contact Inquiry Section */}
      <section className="bg-[#f8fafc] px-6 py-16 md:py-24">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-10 md:flex-row">
          {/* Info Cards Column */}
          <div className="flex flex-col gap-4 md:w-1/3">
            {[
              { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-50", title: "채팅 상담", text1: "평일 09:00 - 18:00", text2: "빠른 답변 보장", link: "채팅 시작 >" },
              { icon: Mail, color: "text-green-500", bg: "bg-green-50", title: "이메일 문의", text1: "hello@dugoconnect.com", text2: "24시간 이내 답변" },
              { icon: Phone, color: "text-purple-500", bg: "bg-purple-50", title: "전화 상담", text1: "02-1234-5878", text2: "평일 09:00 - 18:00" },
              { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", title: "운영 시간", text1: "평일 09:00 - 18:00", text2: "(주말, 공휴일 휴무)" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} shrink-0`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-slate-900">{item.title}</h4>
                  <p className="text-sm text-slate-500">{item.text1}</p>
                  <p className="text-sm text-slate-400">{item.text2}</p>
                  {item.link ? (
                    <Link href="/my-connect?tab=support" className="mt-1 inline-block text-sm font-bold text-blue-600 hover:underline">
                      {item.link}
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Form Column */}
          <div className="flex-1 rounded-[24px] md:rounded-[32px] border border-slate-100 bg-white p-6 sm:p-8 md:p-10 shadow-sm">
            <h3 className="mb-8 text-xl font-bold text-slate-900">문의하기</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">이름 *</label>
                  <input
                    type="text"
                    placeholder="홍길동"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">이메일 *</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">회사명</label>
                <input
                  type="text"
                  placeholder="(주) 두고바이오"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">문의 내용 *</label>
                <textarea
                  placeholder="문의하실 내용을 입력해주세요..."
                  required
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0052ff] py-4 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
              >
                문의 제출
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 3. FAQ Section */}
      <section className="bg-white px-6 py-16 md:py-24">
        <div className="mx-auto max-w-[1000px]">
          <div className="mb-12 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">자주 묻는 질문</h2>
            <p className="mt-4 text-sm md:text-base text-slate-500">
              두고커넥트 이용에 대한 자주 묻는 질문들을 모았습니다.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-300 bg-white transition-all"
              >
                <button
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-5 md:p-6 text-left focus:outline-none"
                >
                  <span className={`text-sm md:text-[16px] font-bold transition-colors ${openIdx === idx ? "text-blue-600" : "text-slate-800"}`}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${openIdx === idx ? "rotate-180 text-blue-600" : ""
                      }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${openIdx === idx
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                    }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 md:px-6 pb-5 md:pb-6 text-sm md:text-[15px] leading-relaxed text-slate-500">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
