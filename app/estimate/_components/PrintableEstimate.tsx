"use client";

import React from "react";
import type { CurrencyCode } from "@/lib/currency";
import { formatCurrency, formatCurrencyCodeLabel } from "@/lib/currency";

interface EstimateRow {
  title: string;
  spec: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

interface PrintableEstimateProps {
  orderNumber: string;
  orderDate: string;
  totalPrice: number;
  currencyCode: CurrencyCode;
  displayRows: EstimateRow[];
  supplierName?: string | null;
  supplierLogo?: string | null;
  supplierAddress?: string | null;
  recipientBrandName?: string | null;
  recipientContactName?: string | null;
}

export function PrintableEstimate({
  orderNumber,
  orderDate,
  totalPrice,
  currencyCode,
  displayRows,
  supplierName,
  supplierLogo,
  supplierAddress,
  recipientBrandName,
  recipientContactName,
}: PrintableEstimateProps) {
  const supplierLabel = supplierName || "DOGO CONNECT";
  const supplierAddressText = supplierAddress || "제조사 등록 주소 기준";
  const recipientLines = [recipientBrandName?.trim(), recipientContactName?.trim()].filter(
    (line): line is string => Boolean(line)
  );

  return (
    <div className="min-h-[1000px] bg-white p-12 text-black shadow-2xl print:p-0 print:shadow-none">
      <div className="mb-10 flex items-start justify-between">
        <div className="flex h-[180px] w-[250px] items-center justify-center overflow-hidden bg-white p-5">
          {supplierLogo ? (
            <img src={supplierLogo} alt={supplierLabel} className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="h-full w-full bg-white" />
          )}
        </div>

        <div className="flex-1 text-center">
          <h1 className="inline-block border-b-[6px] border-black px-14 pb-1 text-[30px] font-black tracking-[0.35em]">
            견적서
          </h1>
        </div>

        <div className="w-[230px]" />
      </div>

      <div className="mb-8 flex justify-between gap-8">
        <div className="w-1/2 space-y-3">
          <div className="space-y-1">
            <p className="text-[14px] font-bold">No. {orderNumber}</p>
            <p className="text-[14px] font-bold">Date. {orderDate}</p>
          </div>
          <div className="mt-10 w-4/5 border-b-2 border-black pb-2">
            <p className="text-[20px] font-black">귀하</p>
          </div>
          {recipientLines.length > 0 ? (
            <div className="mt-4 space-y-1">
              {recipientLines.map((line) => (
                <p key={line} className="text-[15px] font-bold text-black">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          <p className="mt-4 text-[14px] font-medium leading-relaxed">아래와 같이 견적서를 제출합니다.</p>
        </div>

        <div className="w-[380px]">
          <table className="w-full border-collapse border-[1.5px] border-black text-[12px]">
            <tbody>
              <tr>
                <td rowSpan={4} className="w-8 border border-black bg-gray-50 py-2 text-center font-black leading-tight">
                  공
                  <br />
                  급
                  <br />
                  자
                </td>
                <td className="w-20 border border-black bg-gray-50 p-1.5 text-center font-bold">상호</td>
                <td colSpan={3} className="border border-black p-1.5 text-center font-bold tracking-wider">
                  {supplierLabel}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-50 p-1.5 text-center font-bold">담당</td>
                <td className="border border-black p-1.5 text-center font-bold">DOOGO CONNECT</td>
                <td className="w-12 border border-black bg-gray-50 p-1.5 text-center font-bold">구분</td>
                <td className="border border-black p-1.5 text-center font-bold">제조사</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-50 p-1.5 text-center font-bold">주소</td>
                <td colSpan={3} className="border border-black p-1.5 text-left text-[11px] leading-tight">
                  {supplierAddressText}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-50 p-1.5 text-center font-bold">형태/비고</td>
                <td colSpan={3} className="border border-black p-1.5 text-center font-bold">
                  제조 연계 공급 견적
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between border-[1.5px] border-black bg-gray-50 p-3.5">
        <span className="text-[16px] font-black">총 합계금액 (VAT 별도)</span>
        <span className="text-[22px] font-black tracking-tight">{formatCurrency(totalPrice, currencyCode)}</span>
      </div>

      <table className="mb-8 w-full border-collapse border-[1.5px] border-black text-[13px]">
        <thead className="bg-gray-50">
          <tr className="border-b border-black">
            <th className="w-12 border-r border-black p-2.5 text-center font-bold">No</th>
            <th className="border-r border-black p-2.5 text-center font-bold">품명 및 규격</th>
            <th className="w-20 border-r border-black p-2.5 text-center font-bold">수량</th>
            <th className="w-16 border-r border-black p-2.5 text-center font-bold">단위</th>
            <th className="w-36 border-r border-black p-2.5 text-center font-bold">단가 ({formatCurrencyCodeLabel(currencyCode)})</th>
            <th className="w-40 p-2.5 text-center font-bold">금액 ({formatCurrencyCodeLabel(currencyCode)})</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => (
            <tr key={index} className="h-12 border-b border-gray-300 last:border-b-0">
              <td className="border-r border-black p-2.5 text-center font-medium">{index + 1}</td>
              <td className="border-r border-black p-2.5">
                <p className="text-[14px] font-bold">{row.title}</p>
                <p className="text-[11px] font-medium text-gray-500">{row.spec}</p>
              </td>
              <td className="border-r border-black p-2.5 text-center font-medium">{row.quantity.toLocaleString()}</td>
              <td className="border-r border-black p-2.5 text-center font-medium">{row.quantity > 1 ? "EA" : "SET"}</td>
              <td className="border-r border-black p-2.5 pr-4 text-right font-medium">{formatCurrency(row.unitPrice, currencyCode)}</td>
              <td className="p-2.5 pr-4 text-right font-bold">{formatCurrency(row.amount, currencyCode)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 8 - displayRows.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="h-12 border-b border-gray-100 last:border-b-0">
              <td className="border-r border-black p-2.5 text-center"></td>
              <td className="border-r border-black p-2.5"></td>
              <td className="border-r border-black p-2.5 text-center"></td>
              <td className="border-r border-black p-2.5 text-center"></td>
              <td className="border-r border-black p-2.5 pr-4 text-right"></td>
              <td className="p-2.5 pr-4 text-right"></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-[1.5px] border-black bg-gray-50">
          <tr className="h-14">
            <td colSpan={5} className="p-2.5 text-center text-[15px] font-black">
              총계
            </td>
            <td className="p-2.5 pr-4 text-right text-[16px] font-black">{formatCurrency(totalPrice, currencyCode)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="space-y-3 border-[1.5px] border-black bg-gray-50/50 p-6">
        <p className="mb-3 text-[14px] font-black underline underline-offset-4">[ 안내사항 ]</p>
        <div className="space-y-1.5 px-1">
          <p className="text-[12px] font-medium leading-relaxed">1. 본 견적서는 발행일로부터 7일간 유효하며, 협의에 따라 조정될 수 있습니다.</p>
          <p className="text-[12px] font-medium leading-relaxed">2. 실제 제조 공정은 정식 계약 체결 및 착수금 확인 후 진행됩니다.</p>
          <p className="text-[12px] font-medium leading-relaxed">3. 재료 수급 상황 및 환율 변동에 따라 최종 공급가는 일부 변동될 수 있습니다.</p>
          <p className="text-[12px] font-medium leading-relaxed">4. 기타 상세 문의는 담당 매니저를 통해 안내받으실 수 있습니다.</p>
        </div>
      </div>

      <div className="mt-14 text-center">
        <p className="text-[16px] font-black italic tracking-[0.2em] opacity-30">{supplierLabel}</p>
      </div>
    </div>
  );
}
