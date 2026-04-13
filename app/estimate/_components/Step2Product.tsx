"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";

import { type EstimateSelection, type Product } from "../_data/catalog";
import { ProductCard } from "./ProductCard";
import { ProductPreviewModal } from "./ProductPreviewModal";

export function Step2Product({
  manufacturerName,
  products,
  catalogLoading,
  selection,
  setSelection,
  onReset,
}: {
  manufacturerName: string;
  products: Product[];
  catalogLoading: boolean;
  selection: EstimateSelection;
  setSelection: (value: EstimateSelection) => void;
  onReset: () => void;
}) {
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = useMemo(
    () => products.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, products]
  );

  return (
    <>
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#f2f4f6] pb-6">
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-[#191f28]">제품 선택</h2>
            <p className="mt-1 text-[14px] text-[#4e5968]">
              <span className="font-bold text-[#3182f6]">{manufacturerName}</span>의 제조 가능 제품 리스트입니다.
            </p>
          </div>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-full bg-[#f2f4f6] px-3 py-2 text-[12px] font-bold text-[#4e5968] hover:bg-[#e5e8eb] transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 처음으로
          </button>
        </div>



        {catalogLoading ? (
          <div className="flex h-[300px] flex-col items-center justify-center rounded-[12px] border border-[#f2f4f6] bg-white shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-[#3182f6]" />
            <p className="mt-4 text-[14px] text-[#8b95a1]">제품 정보를 불러오고 있습니다...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#e5e8eb] bg-[#f9fafb] p-16 text-center text-[15px] font-medium text-[#8b95a1]">
            해당 제조사에 등록된 제품이 없습니다.
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {pagedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  selected={selection.product === product.id}
                  onClick={() => setSelection({ ...selection, product: product.id, container: null })}
                  onPreview={() => setPreviewProduct(product)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e8eb] bg-white text-[#4e5968] transition-all hover:border-[#3182f6] hover:text-[#3182f6] disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const pageNumber = index + 1;
                    const isActive = pageNumber === currentPage;

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`flex h-10 min-w-10 items-center justify-center rounded-full text-[14px] font-bold transition-all ${isActive
                          ? "bg-[#3182f6] text-white shadow-md shadow-[#3182f6]/20"
                          : "border border-[#e5e8eb] bg-white text-[#4e5968] hover:border-[#3182f6] hover:text-[#3182f6]"
                          }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e8eb] bg-white text-[#4e5968] transition-all hover:border-[#3182f6] hover:text-[#3182f6] disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {previewProduct && <ProductPreviewModal product={previewProduct} onClose={() => setPreviewProduct(null)} />}
    </>
  );
}
