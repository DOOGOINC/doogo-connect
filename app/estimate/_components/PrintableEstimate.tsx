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
  supplierEmail?: string | null;
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
  supplierEmail,
  supplierLogo,
  supplierAddress,
  recipientBrandName,
  recipientContactName,
}: PrintableEstimateProps) {
  const supplierLabel = supplierName || "DOGO CONNECT";
  const supplierAddressText = supplierAddress || "제조사 등록 주소 기재";
  const recipientBrand = recipientBrandName?.trim() || "";
  const recipientContact = recipientContactName?.trim() || "";

  return (
    <div className="mx-auto min-h-fit w-full max-w-[800px] bg-white p-10 text-bold shadow-2xl print:max-w-none print:p-0 print:shadow-none">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex h-[120px] w-[180px] items-center justify-center overflow-hidden bg-white p-2">
          {supplierLogo ? (
            <img src={supplierLogo} alt={supplierLabel} className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="h-full w-full bg-white" />
          )}
        </div>

        <div className="flex-1 pt-6 text-center">
          <h1 className="inline-block border-b-[3px] border-bold px-12 pb-1 text-[28px] font-bold tracking-[0.35em]">
            견적서
          </h1>
        </div>

        <div className="w-[160px]" />
      </div>

      <div className="mb-6 flex justify-between gap-8">
        <div className="w-1/2 space-y-2">
          <div className="space-y-0.5">
            <p className="text-[13px] font-bold">No. {orderNumber}</p>
            <p className="text-[13px] font-bold">Date. {orderDate}</p>
            <p className="text-[13px] font-bold">Email : {supplierEmail || ""}</p>
          </div>
          {recipientBrand ? (
            <div className="mt-6 w-4/5 border-b-2 border-black pb-1">
              <p className="text-[18px] font-medium leading-tight text-black">
                {recipientBrand} <span className="font-bold">귀하</span>
              </p>
              {recipientContact ? (
                <p className="mt-1 text-[12px] font-medium leading-tight text-black">{recipientContact}</p>
              ) : null}
            </div>
          ) : null}
          <p className="mt-3 text-[13px] font-medium leading-relaxed">아래와 같이 견적서를 제출합니다.</p>
        </div>

        <div className="w-[360px]">
          <table className="w-full border-collapse border-[1.5px] border-black text-[11px]">
            <tbody>
              <tr>
                <td rowSpan={4} className="w-7 border border-black bg-gray-50 py-2 text-center text-[10px] font-black leading-tight">
                  공
                  <br />
                  급
                  <br />
                  자
                </td>
                <td className="w-16 border border-black bg-gray-50 p-1 text-center font-bold">상호</td>
                <td colSpan={3} className="border border-black p-1 text-center font-bold tracking-wider">
                  {supplierLabel}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-50 p-1 text-center font-bold">담당</td>
                <td className="border border-black p-1 text-center font-bold">DOOGO CONNECT</td>
                <td className="w-10 border border-black bg-gray-50 p-1 text-center font-bold">구분</td>
                <td className="border border-black p-1 text-center font-bold">제조사</td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-50 p-1 text-center font-bold">주소</td>
                <td colSpan={3} className="border border-black p-1 text-left text-[10px] leading-tight">
                  {supplierAddressText}
                </td>
              </tr>
              <tr>
                <td className="border border-black bg-gray-50 p-1 text-center font-bold">업태/비고</td>
                <td colSpan={3} className="border border-black p-1 text-center font-bold">
                  제조 관련 공급 견적
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between border-[1.5px] border-black bg-gray-50 p-3">
        <span className="text-[14px] font-black">총 합계금액</span>
        <span className="text-[20px] font-black tracking-tight">{formatCurrency(totalPrice, currencyCode)}</span>
      </div>

      <table className="mb-6 w-full border-collapse border-[1.5px] border-black text-[12px]">
        <thead className="bg-gray-50">
          <tr className="border-b border-black">
            <th className="w-10 border-r border-black p-2 text-center font-bold">No</th>
            <th className="border-r border-black p-2 text-center font-bold">품명 및 규격</th>
            <th className="w-16 border-r border-black p-2 text-center font-bold">수량</th>
            <th className="w-14 border-r border-black p-2 text-center font-bold">단위</th>
            <th className="w-32 border-r border-black p-2 text-center font-bold">단가 ({formatCurrencyCodeLabel(currencyCode)})</th>
            <th className="w-36 p-2 text-center font-bold">금액 ({formatCurrencyCodeLabel(currencyCode)})</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => (
            <tr key={index} className="h-10 border-b border-gray-300 last:border-b-0">
              <td className="border-r border-black p-2 text-center font-medium">{index + 1}</td>
              <td className="border-r border-black p-2">
                <p className="text-[13px] font-bold">{row.title}</p>
                <p className="text-[10px] font-medium text-gray-500">{row.spec}</p>
              </td>
              <td className="border-r border-black p-2 text-center font-medium">{row.quantity.toLocaleString()}</td>
              <td className="border-r border-black p-2 text-center font-medium">{row.quantity > 1 ? "EA" : "SET"}</td>
              <td className="border-r border-black p-2 pr-3 text-right font-medium">{formatCurrency(row.unitPrice, currencyCode)}</td>
              <td className="p-2 pr-3 text-right font-bold">{formatCurrency(row.amount, currencyCode)}</td>
            </tr>
          ))}

          {Array.from({ length: Math.max(0, 6 - displayRows.length) }).map((_, i) => (
            <tr key={`empty-${i}`} className="h-10 border-b border-gray-100 last:border-b-0">
              <td className="border-r border-black p-2 text-center"></td>
              <td className="border-r border-black p-2"></td>
              <td className="border-r border-black p-2 text-center"></td>
              <td className="border-r border-black p-2 text-center"></td>
              <td className="border-r border-black p-2 pr-3 text-right"></td>
              <td className="p-2 pr-3 text-right"></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-[1.5px] border-black bg-gray-50">
          <tr className="h-12">
            <td colSpan={5} className="p-2 text-center text-[14px] font-black">
              총계
            </td>
            <td className="p-2 pr-3 text-right text-[15px] font-black">{formatCurrency(totalPrice, currencyCode)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="space-y-2 border-[1.5px] border-black bg-gray-50/50 p-5">
        <p className="mb-2 text-[13px] font-black underline underline-offset-4">[ 안내사항 ]</p>
        <div className="space-y-1 px-1">
          <p className="text-[11px] font-medium leading-relaxed">1. 본 견적서는 발행일로부터 7일간 유효하며, 협의에 따라 조정될 수 있습니다.</p>
          <p className="text-[11px] font-medium leading-relaxed">2. 실제 제조 공정은 정식 계약 체결 및 착수금 확인 후 진행됩니다.</p>
          <p className="text-[11px] font-medium leading-relaxed">3. 원료 수급 상황 및 환율 변동에 따라 최종 공급가액은 일부 변동될 수 있습니다.</p>
          <p className="text-[11px] font-medium leading-relaxed">4. 기타 상세 문의는 담당 매니저를 통해 안내받으실 수 있습니다.</p>
        </div>
      </div>

      <div className="mt-10 text-center">
        <p className="text-[14px] font-black italic tracking-[0.2em] opacity-30">{supplierLabel}</p>
      </div>
    </div>
  );
}
