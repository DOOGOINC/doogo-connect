"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp, Search } from "lucide-react";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import { formatCurrency, normalizeCurrencyCode } from "@/lib/currency";
import type { ProductRow } from "./productCatalogShared";

type ProductInventoryManagementProps = {
  items: ProductRow[];
  onUpdateProduct: (productId: string, patch: Partial<Pick<ProductRow, "stock_quantity" | "admin_memo">>) => Promise<void>;
};

const ITEMS_PER_PAGE = 10;

type SortDirection = "asc" | "desc";

const toStockValue = (value: number | null | undefined) => Math.max(0, Math.trunc(Number(value || 0)));

export function ProductInventoryManagement({ items, onUpdateProduct }: ProductInventoryManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adjustDrafts, setAdjustDrafts] = useState<Record<string, string>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setAdjustDrafts(Object.fromEntries(items.map((item) => [item.id, "1"])));
    setStockDrafts(Object.fromEntries(items.map((item) => [item.id, String(toStockValue(item.stock_quantity))])));
    setMemoDrafts(Object.fromEntries(items.map((item) => [item.id, item.admin_memo || ""])));
  }, [items]);

  const searchedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [item.id, item.category, item.name, item.admin_memo || ""].some((value) => value.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  const sortedItems = useMemo(
    () =>
      [...searchedItems].sort((a, b) => {
        const aStock = toStockValue(a.stock_quantity);
        const bStock = toStockValue(b.stock_quantity);

        if (aStock === bStock) {
          return a.id.localeCompare(b.id);
        }

        return sortDirection === "asc" ? aStock - bStock : bStock - aStock;
      }),
    [searchedItems, sortDirection]
  );

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, sortedItems]);

  const applyInventoryPatch = async (productId: string, patch: Partial<Pick<ProductRow, "stock_quantity" | "admin_memo">>) => {
    setUpdatingId(productId);
    try {
      await onUpdateProduct(productId, patch);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAdjustStock = async (item: ProductRow, mode: "increase" | "decrease") => {
    const amount = Math.max(0, Math.trunc(Number(adjustDrafts[item.id] || 0)));
    if (!amount) return;

    const currentStock = toStockValue(item.stock_quantity);
    const nextStock = mode === "increase" ? currentStock + amount : Math.max(0, currentStock - amount);

    setStockDrafts((prev) => ({ ...prev, [item.id]: String(nextStock) }));
    await applyInventoryPatch(item.id, { stock_quantity: nextStock });
  };

  const handleSetStock = async (item: ProductRow) => {
    const nextStock = Math.max(0, Math.trunc(Number(stockDrafts[item.id] || 0)));
    if (nextStock === toStockValue(item.stock_quantity)) return;

    await applyInventoryPatch(item.id, { stock_quantity: nextStock });
  };

  const handleMemoBlur = async (item: ProductRow) => {
    const nextMemo = memoDrafts[item.id] || "";
    const currentMemo = item.admin_memo || "";
    if (nextMemo === currentMemo) return;

    await applyInventoryPatch(item.id, { admin_memo: nextMemo.trim() || null });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-[#f2f4f6] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[24px] font-bold text-[#191F28]">OEM 상품 재고 관리</h2>
          <p className="mt-2 text-[15px] text-[#8B95A1]">상품별 재고를 수동으로 차감, 증가, 수정할 수 있습니다.</p>
        </div>

        <label className="relative block w-full lg:w-[360px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA4B2]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="상품 ID, 카테고리, 상품명, 메모 검색"
            className="h-11 w-full rounded-[12px] border border-[#E5E8EB] bg-white pl-11 pr-4 text-[14px] text-[#191F28] outline-none transition placeholder:text-[#9AA4B2] focus:border-[#3182F6]"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#E5E8EB] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1800px] table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#6a7282]">
                <th className="w-[180px] px-5 py-3">상품 ID</th>
                <th className="w-[140px] px-4 py-3">카테고리</th>
                <th className="w-[220px] px-4 py-3">상품명</th>
                <th className="w-[110px] px-4 py-3">결제통화</th>
                <th className="w-[140px] px-4 py-3 text-right">원가</th>
                <th className="w-[140px] px-4 py-3 text-right">가격</th>
                <th className="w-[360px] cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]" onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}>
                  <div className="flex items-center">
                    재고관리
                    {sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-3 w-3 text-[#0064ff]" />
                    ) : sortDirection === "desc" ? (
                      <ChevronDown className="ml-1 h-3 w-3 text-[#0064ff]" />
                    ) : (
                      <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="px-5 py-3">관리자 메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f6]">
              {pagedItems.length ? (
                pagedItems.map((item) => {
                  const currentStock = toStockValue(item.stock_quantity);
                  return (
                    <tr key={item.id} className="align-middle transition-colors hover:bg-[#fcfdff]">
                      <td className="px-5 py-3.5">
                        <span className="block truncate font-mono text-[11px] text-[#191f28]">{item.id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block truncate text-[12px] font-bold text-[#191f28]">{item.category}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block truncate text-[12px] text-[#4e5968]" title={item.name}>
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block truncate text-[12px] font-bold text-[#191f28]">{normalizeCurrencyCode(item.payment_currency)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="block truncate text-[12px] font-bold text-[#191f28]">
                          {formatCurrency(item.cost_price || 0, normalizeCurrencyCode(item.payment_currency))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="block truncate text-[12px] font-bold text-[#0064ff]">
                          {formatCurrency(item.base_price || 0, normalizeCurrencyCode(item.payment_currency))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-2">
                          <div className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-bold text-[#2563eb]">
                            현재 재고 {currentStock.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={adjustDrafts[item.id] ?? "1"}
                              disabled={updatingId === item.id}
                              onChange={(event) => setAdjustDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                              className="h-9 w-20 rounded-lg border border-[#e5e8eb] bg-white px-3 text-[12px] text-[#4e5968] outline-none transition-colors focus:border-[#0064ff] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                            />
                            <button
                              type="button"
                              disabled={updatingId === item.id}
                              onClick={() => void handleAdjustStock(item, "decrease")}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5e8eb] bg-white px-3 text-[12px] font-bold text-[#4e5968] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                            >
                              차감
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === item.id}
                              onClick={() => void handleAdjustStock(item, "increase")}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#dbe3ef] bg-white px-3 text-[12px] font-bold text-[#2563eb] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                            >
                              증가
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={stockDrafts[item.id] ?? String(currentStock)}
                              disabled={updatingId === item.id}
                              onChange={(event) => setStockDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                              className="h-9 w-24 rounded-lg border border-[#e5e8eb] bg-white px-3 text-[12px] text-[#4e5968] outline-none transition-colors focus:border-[#0064ff] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                            />
                            <button
                              type="button"
                              disabled={updatingId === item.id}
                              onClick={() => void handleSetStock(item)}
                              className="inline-flex h-9 items-center justify-center rounded-lg bg-[#475467] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[#344054] disabled:cursor-not-allowed disabled:bg-[#98a2b3]"
                            >
                              수정
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <input
                          type="text"
                          value={memoDrafts[item.id] ?? ""}
                          disabled={updatingId === item.id}
                          onChange={(event) => setMemoDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                          onBlur={() => void handleMemoBlur(item)}
                          placeholder="관리 메모 입력..."
                          className="h-9 w-full rounded-lg border border-[#e5e8eb] bg-white px-3 text-[12px] text-[#4e5968] outline-none transition-colors focus:border-[#0064ff] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center">
                      <Search className="mb-4 h-10 w-10 text-[#e5e8eb]" />
                      <p className="text-[15px] font-bold text-[#8b95a1]">조건에 맞는 상품이 없습니다.</p>
                      <p className="mt-1 text-[13px] text-[#adb5bd]">검색어를 조정해 주세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sortedItems.length > ITEMS_PER_PAGE ? (
          <MasterTablePagination
            totalItems={sortedItems.length}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}
