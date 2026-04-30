"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type SettlementRow = {
  month: string;
  nzdBase: number;
  nzdProfit: number;
  krwBase: number;
  krwProfit: number;
  settledAt: string;
  status: "완료" | "대기";
};

const DUMMY_DATA: SettlementRow[] = [
  {
    month: "2026-04",
    nzdBase: 29650,
    nzdProfit: 593,
    krwBase: 5200000,
    krwProfit: 104000,
    settledAt: "2026-04-27",
    status: "완료",
  },
  {
    month: "2026-03",
    nzdBase: 24780,
    nzdProfit: 496,
    krwBase: 4800000,
    krwProfit: 96000,
    settledAt: "2026-04-05",
    status: "완료",
  },
  {
    month: "2026-02",
    nzdBase: 22400,
    nzdProfit: 448,
    krwBase: 4100000,
    krwProfit: 82000,
    settledAt: "2026-03-05",
    status: "완료",
  },
  {
    month: "2026-01",
    nzdBase: 18500,
    nzdProfit: 370,
    krwBase: 3200000,
    krwProfit: 64000,
    settledAt: "2026-02-05",
    status: "완료",
  },
];

export function PartnerSettlementAdmin() {
  const [selectedPartner, setSelectedPartner] = useState("PARTNER001");

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#f8fafc] px-6 py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
        {/* Header */}
        <section>
          <h1 className="flex items-center gap-2 text-[24px] font-bold tracking-tight text-[#1f2937]">
            <span className="text-[20px]">💸</span> 파트너 정산 관리
          </h1>
          <p className="mt-1 text-[14px] font-medium text-[#6b7280]">두고커넥트 운영 관리 시스템</p>
        </section>

        {/* Partner Selection */}
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <p className="mb-4 text-[13px] font-bold text-[#6b7280]">파트너 선택</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedPartner("PARTNER001")}
              className={`rounded-full px-6 py-2.5 text-[14px] font-bold transition ${
                selectedPartner === "PARTNER001"
                  ? "bg-[#2563eb] text-white"
                  : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
              }`}
            >
              김파트너 (PARTNER001)
            </button>
            <button
              onClick={() => setSelectedPartner("PARTNER002")}
              className={`rounded-full px-6 py-2.5 text-[14px] font-bold transition ${
                selectedPartner === "PARTNER002"
                  ? "bg-[#2563eb] text-white"
                  : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
              }`}
            >
              이영업 (PARTNER002)
            </button>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 shadow-sm">
            <p className="text-[13px] font-bold text-[#6b7280]">정산 대기 건수</p>
            <p className="mt-2 text-[24px] font-black text-[#ea580c]">0건</p>
          </article>
          <article className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 shadow-sm">
            <p className="text-[13px] font-bold text-[#6b7280]">대기 정산 총액 (NZD)</p>
            <p className="mt-2 text-[24px] font-black text-[#2563eb]">NZD 0</p>
          </article>
          <article className="rounded-[14px] border border-[#e5e7eb] bg-white px-6 py-5 shadow-sm">
            <p className="text-[13px] font-bold text-[#6b7280]">완료 건수</p>
            <p className="mt-2 text-[24px] font-black text-[#16a34a]">4건</p>
          </article>
        </section>

        {/* Table Section */}
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 py-5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#1e293b]">
              <span className="text-[#16a34a]">💸</span> {selectedPartner === "PARTNER001" ? "김파트너" : "이영업"} 정산 관리
            </h2>
            <p className="text-[12px] font-medium text-[#94a3b8]">정산 완료 버튼을 눌러 수동 정산 처리하세요</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fafc] text-[12px] font-bold text-[#64748b]">
                  <th className="px-6 py-4">정산월</th>
                  <th className="px-6 py-4">NZD 기준금액</th>
                  <th className="px-6 py-4">NZD 파트너수익(2%)</th>
                  <th className="px-6 py-4">KRW 기준금액</th>
                  <th className="px-6 py-4">KRW 파트너수익(2%)</th>
                  <th className="px-6 py-4">정산일</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {DUMMY_DATA.map((row) => (
                  <tr key={row.month} className="text-[14px] font-medium text-[#334155] hover:bg-[#fcfdfe]">
                    <td className="px-6 py-5 font-bold">{row.month}</td>
                    <td className="px-6 py-5">NZD {row.nzdBase.toLocaleString()}</td>
                    <td className="px-6 py-5 font-bold text-[#2563eb]">NZD {row.nzdProfit.toLocaleString()}</td>
                    <td className="px-6 py-5">₩{row.krwBase.toLocaleString()}</td>
                    <td className="px-6 py-5 font-bold text-[#16a34a]">₩{row.krwProfit.toLocaleString()}</td>
                    <td className="px-6 py-5 text-[#64748b]">{row.settledAt}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-[#dcfce7] px-3 py-1 text-[12px] font-bold text-[#16a34a]">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#16a34a]">
                        <Check className="h-4 w-4" />
                        처리완료
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
