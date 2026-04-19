"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown, Clock, Mail, MessageCircle, Phone, Send } from "lucide-react";

const faqs = [
  {
    question: "최소 주문 수량(MOQ)은 어느 정도인가요?",
    answer: "최소 50개부터 주문 가능합니다. 제품 종류와 수량에 따라 달라질 수 있으며, 정확한 가이드는 문의 후 안내해 드립니다.",
  },
  {
    question: "제조 기간은 얼마나 걸리나요?",
    answer: "일반적으로 주문 확정 후 3~4주 정도가 필요합니다. 제품 사양과 수량에 따라 일정은 조정될 수 있습니다.",
  },
  {
    question: "디자인 파일이 없어도 진행 가능한가요?",
    answer: "가능합니다. 로고 정리부터 패키지 디자인까지 함께 도와드리고 있습니다.",
  },
  {
    question: "해외 배송도 가능한가요?",
    answer: "가능합니다. 주요 국가 기준으로 배송을 지원하며 통관과 서류 안내도 함께 제공합니다.",
  },
  {
    question: "해외 제조사와 거래할 때 결제는 어떻게 하나요?",
    answer: "해외 거래에 필요한 결제 프로세스와 통화 송금, 서류 처리까지 안내해 드립니다.",
  },
  {
    question: "견적 금액은 변경될 수 있나요?",
    answer: "원자재 가격과 수량 조건에 따라 최종 견적은 상담 과정에서 조정될 수 있습니다.",
  },
];

type FormState = {
  name: string;
  email: string;
  company: string;
  content: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  company: "",
  content: "",
};

export default function SupportPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/support/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "문의 제출에 실패했습니다.");
      }

      window.alert("문의가 접수되었습니다. 빠르게 확인 후 연락드리겠습니다.");
      setFormData(INITIAL_FORM);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "문의 제출 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-r from-[#1b3e7a] to-[#235bd4] pb-16 pt-24 text-center text-white md:pb-24 md:pt-32">
        <div className="mx-auto max-w-[1000px] px-6">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-[11px] font-semibold backdrop-blur-sm md:text-xs">
            고객 지원
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl md:leading-tight">
            두고커넥트와 함께
            <br />
            브랜드를 만드는 이야기
          </h1>
          <p className="mx-auto mt-4 max-w-[700px] text-base font-medium text-white/80 sm:text-lg">
            오세아니아에서 시작해 세계로 뻗어나가는 두고커넥트.
            <br />
            의뢰자와 제조사가 1:1 대화로 안전하게 거래합니다.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="flex flex-col items-center rounded-2xl border border-white/5 bg-white/10 p-6 backdrop-blur-md transition-transform hover:scale-[1.02]">
              <Phone className="h-6 w-6 text-yellow-400" />
              <span className="mt-3 text-sm font-medium text-white/70">전화 문의</span>
              <span className="mt-1 text-lg font-bold text-white">+1 (800) DUGO-OEM</span>
              <span className="mt-1 text-xs text-white/50">평일 09:00~18:00</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md transition-transform hover:scale-[1.02]">
              <Mail className="h-6 w-6 text-blue-300" />
              <span className="mt-3 text-sm font-medium text-white/70">이메일 문의</span>
              <span className="mt-1 break-all text-lg font-bold text-white">hello@dugo-connect.com</span>
              <span className="mt-1 text-xs text-white/50">24시간 접수 가능</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-white/5 bg-white/10 p-6 backdrop-blur-md transition-transform hover:scale-[1.02] sm:col-span-2 md:col-span-1">
              <MessageCircle className="h-6 w-6 text-green-400" />
              <span className="mt-3 text-sm font-medium text-white/70">채팅 상담</span>
              <span className="mt-1 text-lg font-bold text-white">마이 커넥트 고객센터</span>
              <span className="mt-1 text-xs text-white/50">승인 후 1:1 상담 진행</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] px-6 py-16 md:py-24">
        <div className="mx-auto flex max-w-[1000px] flex-col gap-10 md:flex-row">
          <div className="flex flex-col gap-4 md:w-1/3">
            {[
              { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-50", title: "채팅 상담", text1: "평일 09:00 - 18:00", text2: "빠른 답변 보장", link: "채팅 시작하기" },
              { icon: Mail, color: "text-green-500", bg: "bg-green-50", title: "이메일 문의", text1: "hello@dugo-connect.com", text2: "일반 문의 접수 가능" },
              { icon: Phone, color: "text-purple-500", bg: "bg-purple-50", title: "전화 상담", text1: "02-1234-5878", text2: "평일 09:00 - 18:00" },
              { icon: Clock, color: "text-orange-500", bg: "bg-orange-50", title: "운영 시간", text1: "평일 09:00 - 18:00", text2: "주말, 공휴일 제외" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.bg}`}>
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

          <div className="flex-1 rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8 md:rounded-[32px] md:p-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#0064FF]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">문의하기</h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">이름 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    required
                    placeholder="성함을 입력해 주세요"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">이메일 *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    required
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">회사명</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(event) => updateField("company", event.target.value)}
                  placeholder="회사명이 있다면 입력해 주세요"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">문의 내용 *</label>
                <textarea
                  value={formData.content}
                  onChange={(event) => updateField("content", event.target.value)}
                  required
                  rows={5}
                  placeholder="문의하실 내용을 입력해 주세요."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0052ff] py-4 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "제출 중..." : "문의 제출"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16 md:py-24">
        <div className="mx-auto max-w-[1000px]">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">자주 묻는 질문</h2>
            <p className="mt-4 text-sm text-slate-500 md:text-base">서비스 이용 전에 가장 많이 확인하시는 내용을 정리했습니다.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={faq.question} className="rounded-2xl border border-slate-300 bg-white transition-all">
                <button
                  type="button"
                  onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left focus:outline-none md:p-6"
                >
                  <span className={`text-sm font-bold transition-colors md:text-[16px] ${openIdx === idx ? "text-blue-600" : "text-slate-800"}`}>
                    {faq.question}
                  </span>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${openIdx === idx ? "rotate-180 text-blue-600" : ""}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${openIdx === idx ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500 md:px-6 md:pb-6 md:text-[15px]">{faq.answer}</p>
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
