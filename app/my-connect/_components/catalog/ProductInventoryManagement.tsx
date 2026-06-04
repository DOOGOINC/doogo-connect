"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, Image as ImageIcon, Search } from "lucide-react";
import { MasterTablePagination } from "@/app/master/_components/MasterTablePagination";
import { formatCurrency, normalizeCurrencyCode } from "@/lib/currency";
import type { ProductRow } from "./productCatalogShared";

type ProductInventoryManagementProps = {
  items: ProductRow[];
  onUpdateProduct: (productId: string, patch: Partial<Pick<ProductRow, "stock_quantity" | "admin_memo">>) => Promise<void>;
  resolveImageUrl: (pathOrUrl: string | null | undefined) => string;
};

const ITEMS_PER_PAGE = 10;

type SortDirection = "asc" | "desc";
type SortKey = "cost_price" | "base_price" | "stock_quantity";
type SortState = { key: SortKey; direction: SortDirection } | null;
type ColumnKey = "image" | "id" | "category" | "name" | "currency" | "cost" | "price" | "inventory" | "memo";
type ResizeState = { key: ColumnKey; startX: number; startWidth: number } | null;

const columnConfig: Array<{ key: ColumnKey; label: string; defaultWidth: number; minWidth: number }> = [
  { key: "image", label: "이미지", defaultWidth: 88, minWidth: 88 },
  { key: "id", label: "상품 ID", defaultWidth: 180, minWidth: 140 },
  { key: "category", label: "카테고리", defaultWidth: 140, minWidth: 120 },
  { key: "name", label: "상품명", defaultWidth: 220, minWidth: 180 },
  { key: "currency", label: "결제통화", defaultWidth: 110, minWidth: 100 },
  { key: "cost", label: "원가", defaultWidth: 140, minWidth: 120 },
  { key: "price", label: "가격", defaultWidth: 140, minWidth: 120 },
  { key: "inventory", label: "재고관리", defaultWidth: 460, minWidth: 380 },
  { key: "memo", label: "관리자 메모", defaultWidth: 320, minWidth: 220 },
];

const initialColumnWidths = Object.fromEntries(columnConfig.map((column) => [column.key, column.defaultWidth])) as Record<ColumnKey, number>;
const minColumnWidths = Object.fromEntries(columnConfig.map((column) => [column.key, column.minWidth])) as Record<ColumnKey, number>;

const toStockValue = (value: number | null | undefined) => Math.max(0, Math.trunc(Number(value || 0)));
const toMoneyValue = (value: number | null | undefined) => Number(value || 0);

const getSortIcon = (activeSort: SortState, key: SortKey) => {
  if (!activeSort || activeSort.key !== key) {
    return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
  }

  return activeSort.direction === "asc" ? (
    <ChevronUp className="ml-1 h-3 w-3 text-[#0064ff]" />
  ) : (
    <ChevronDown className="ml-1 h-3 w-3 text-[#0064ff]" />
  );
};

export function ProductInventoryManagement({ items, onUpdateProduct, resolveImageUrl }: ProductInventoryManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState<SortState>(null);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(initialColumnWidths);
  const [resizeState, setResizeState] = useState<ResizeState>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [adjustDrafts, setAdjustDrafts] = useState<Record<string, string>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setAdjustDrafts(Object.fromEntries(items.map((item) => [item.id, "1"])));
    setStockDrafts(Object.fromEntries(items.map((item) => [item.id, String(toStockValue(item.stock_quantity))])));
    setMemoDrafts(Object.fromEntries(items.map((item) => [item.id, item.admin_memo || ""])));
  }, [items]);

  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.max(minColumnWidths[resizeState.key], resizeState.startWidth + (event.clientX - resizeState.startX));
      setColumnWidths((prev) => ({ ...prev, [resizeState.key]: nextWidth }));
    };

    const handleMouseUp = () => {
      setResizeState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizeState]);

  const searchedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) =>
      [item.id, item.category, item.name, item.admin_memo || ""].some((value) => value.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  const sortedItems = useMemo(() => {
    if (!sortState) {
      return searchedItems;
    }

    return [...searchedItems].sort((a, b) => {
      let comparison = 0;

      if (sortState.key === "stock_quantity") {
        comparison = toStockValue(a.stock_quantity) - toStockValue(b.stock_quantity);
      } else if (sortState.key === "cost_price") {
        comparison = toMoneyValue(a.cost_price) - toMoneyValue(b.cost_price);
      } else if (sortState.key === "base_price") {
        comparison = toMoneyValue(a.base_price) - toMoneyValue(b.base_price);
      }

      if (comparison === 0) {
        comparison = a.id.localeCompare(b.id);
      }

      return sortState.direction === "asc" ? comparison : -comparison;
    });
  }, [searchedItems, sortState]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const pagedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, sortedItems]);

  const totalTableWidth = useMemo(
    () => columnConfig.reduce((sum, column) => sum + columnWidths[column.key], 0),
    [columnWidths]
  );

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

  const handleSort = (key: SortKey) => {
    setSortState((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: "asc" };
      }

      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
    setPage(1);
  };

  const startColumnResize = (key: ColumnKey, clientX: number) => {
    setResizeState({
      key,
      startX: clientX,
      startWidth: columnWidths[key],
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-[#f2f4f6] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[24px] font-bold text-[#191F28]">OEM 상품 재고 관리</h2>
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
          <table className="border-collapse table-fixed" style={{ width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }}>
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-[#6a7282]">
                <th className="relative px-4 py-3" style={{ width: `${columnWidths.image}px` }}>
                  이미지
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("image", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
                <th className="relative px-5 py-3" style={{ width: `${columnWidths.id}px` }}>
                  상품 ID
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("id", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
                <th className="relative px-4 py-3" style={{ width: `${columnWidths.category}px` }}>
                  카테고리
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("category", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
                <th className="relative px-4 py-3" style={{ width: `${columnWidths.name}px` }}>
                  상품명
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("name", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
                <th className="relative px-4 py-3" style={{ width: `${columnWidths.currency}px` }}>
                  결제통화
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("currency", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
                <th
                  className="relative cursor-pointer px-4 py-3 text-right transition-colors hover:bg-[#f9fafb]"
                  style={{ width: `${columnWidths.cost}px` }}
                  onClick={() => handleSort("cost_price")}
                >
                  <div className="flex items-center justify-end">
                    원가순
                    {getSortIcon(sortState, "cost_price")}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      startColumnResize("cost", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
                <th
                  className="relative cursor-pointer px-4 py-3 text-right transition-colors hover:bg-[#f9fafb]"
                  style={{ width: `${columnWidths.price}px` }}
                  onClick={() => handleSort("base_price")}
                >
                  <div className="flex items-center justify-end">
                    가격순
                    {getSortIcon(sortState, "base_price")}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      startColumnResize("price", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
                <th
                  className="relative cursor-pointer px-4 py-3 transition-colors hover:bg-[#f9fafb]"
                  style={{ width: `${columnWidths.inventory}px` }}
                  onClick={() => handleSort("stock_quantity")}
                >
                  <div className="flex items-center">
                    재고순
                    {getSortIcon(sortState, "stock_quantity")}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      startColumnResize("inventory", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
                <th className="relative px-5 py-3" style={{ width: `${columnWidths.memo}px` }}>
                  관리자 메모
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-col-resize bg-transparent transition hover:bg-[#EEF4FF]"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("memo", event.clientX);
                    }}
                  >
                    <div className="absolute right-[5px] top-1/2 h-8 w-[1px] -translate-y-1/2 rounded-full bg-[#D9E2EC] transition-colors hover:bg-[#9DBAFD]" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f6]">
              {pagedItems.length ? (
                pagedItems.map((item) => {
                  const currentStock = toStockValue(item.stock_quantity);
                  return (
                    <tr key={item.id} className="align-middle transition-colors hover:bg-[#fcfdff]">
                      <td className="px-4 py-3.5" style={{ width: `${columnWidths.image}px` }}>
                        <div className="relative h-12 w-12 overflow-hidden rounded-[10px] border border-[#F2F4F6] bg-[#F9FAFB]">
                          {resolveImageUrl(item.image) ? (
                            <img src={resolveImageUrl(item.image)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-[#D1D5DB]" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5" style={{ width: `${columnWidths.id}px` }}>
                        <span className="block truncate font-mono text-[11px] text-[#191f28]">{item.id}</span>
                      </td>
                      <td className="px-4 py-3.5" style={{ width: `${columnWidths.category}px` }}>
                        <span className="block truncate text-[12px] font-bold text-[#191f28]">{item.category}</span>
                      </td>
                      <td className="px-4 py-3.5" style={{ width: `${columnWidths.name}px` }}>
                        <span className="block truncate text-[12px] text-[#4e5968]" title={item.name}>
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" style={{ width: `${columnWidths.currency}px` }}>
                        <span className="block truncate text-[12px] font-bold text-[#191f28]">{normalizeCurrencyCode(item.payment_currency)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right" style={{ width: `${columnWidths.cost}px` }}>
                        <span className="block truncate text-[12px] font-bold text-[#191f28]">
                          {formatCurrency(item.cost_price || 0, normalizeCurrencyCode(item.payment_currency))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" style={{ width: `${columnWidths.price}px` }}>
                        <span className="block truncate text-[12px] font-bold text-[#0064ff]">
                          {formatCurrency(item.base_price || 0, normalizeCurrencyCode(item.payment_currency))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" style={{ width: `${columnWidths.inventory}px` }}>
                        <div className="space-y-2.5">
                          <div className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-bold text-[#2563eb]">
                            현재 재고 {currentStock.toLocaleString()}
                          </div>

                          <div className="flex items-center gap-2 rounded-[12px] border border-[#E5E8EB] bg-[#FBFCFD] px-2.5 py-2">
                            <span className="text-[11px] font-semibold text-[#8B95A1]">증감 수량</span>
                            <input
                              type="number"
                              min="0"
                              value={adjustDrafts[item.id] ?? "1"}
                              disabled={updatingId === item.id}
                              onChange={(event) => setAdjustDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                              className="h-8 w-20 rounded-lg border border-[#e5e8eb] bg-white px-3 text-[12px] text-[#4e5968] outline-none transition-colors focus:border-[#0064ff] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                            />
                            <button
                              type="button"
                              disabled={updatingId === item.id}
                              onClick={() => void handleAdjustStock(item, "decrease")}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E8EB] bg-white text-[#4E5968] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                              aria-label="재고 차감"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === item.id}
                              onClick={() => void handleAdjustStock(item, "increase")}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DBE3EF] bg-white text-[#2563EB] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                              aria-label="재고 증가"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 rounded-[12px] border border-[#E5E8EB] bg-white px-2.5 py-2">
                            <span className="text-[11px] font-semibold text-[#8B95A1]">직접 수정</span>
                            <input
                              type="number"
                              min="0"
                              value={stockDrafts[item.id] ?? String(currentStock)}
                              disabled={updatingId === item.id}
                              onChange={(event) => setStockDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                              className="h-8 w-24 rounded-lg border border-[#e5e8eb] bg-white px-3 text-[12px] text-[#4e5968] outline-none transition-colors focus:border-[#0064ff] disabled:cursor-not-allowed disabled:bg-[#f2f4f6]"
                            />
                            <button
                              type="button"
                              disabled={updatingId === item.id}
                              onClick={() => void handleSetStock(item)}
                              className="inline-flex h-8 items-center justify-center rounded-lg bg-[#475467] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[#344054] disabled:cursor-not-allowed disabled:bg-[#98a2b3]"
                            >
                              수정
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5" style={{ width: `${columnWidths.memo}px` }}>
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
                  <td colSpan={9} className="px-8 py-24 text-center">
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
