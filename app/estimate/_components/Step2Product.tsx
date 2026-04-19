"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RotateCcw, Search, Check } from "lucide-react";
import Image from "next/image";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 4;

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.ingredients.some((ing) => ing.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  
  const pagedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredProducts]
  );

  const selectedProductData = useMemo(
    () => products.find((p) => p.id === selection.product),
    [products, selection.product]
  );

  // Determine where to insert the info box in the grid
  const selectedIndexInPaged = pagedProducts.findIndex((p) => p.id === selection.product);
  const insertIndex = selectedIndexInPaged !== -1 
    ? (Math.floor(selectedIndexInPaged / 2) + 1) * 2 
    : -1;

  return (
    <>
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="mb-5">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-4 w-4 text-[#8b95a1]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="제품명 또는 성분으로 검색 (예: 비타민C, 콜라겐)"
              className="h-[42px] w-full rounded-[10px] border border-[#e5e8eb] bg-[#f9fafb] pl-10 pr-4 text-[13px] outline-none transition-all focus:border-[#0052cc] focus:bg-white focus:ring-1 focus:ring-[#0052cc]"
            />
          </div>
        </div>

        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[17px] font-bold tracking-tight text-[#191f28]">제품 선택</h2>
          
          <div className="flex items-center gap-4">
             {totalPages > 1 && (
               <div className="flex items-center gap-3 text-[12px] font-medium text-[#8b95a1]">
                 <button
                   onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                   disabled={currentPage === 1}
                   className="p-1 disabled:opacity-30"
                 >
                   <ChevronLeft className="h-4 w-4" />
                 </button>
                 <span className="text-[#191f28]">{currentPage}</span> / {totalPages}
                 <button
                   onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                   disabled={currentPage === totalPages}
                   className="p-1 disabled:opacity-30"
                 >
                   <ChevronRight className="h-4 w-4" />
                 </button>
               </div>
             )}
          </div>
        </div>

        {catalogLoading ? (
          <div className="flex h-[240px] flex-col items-center justify-center rounded-[16px] border border-[#f2f4f6] bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-[#0052cc]" />
            <p className="mt-4 text-[13px] text-[#8b95a1]">제품 정보를 불러오고 있습니다...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#e5e8eb] bg-[#f9fafb] p-16 text-center">
            <p className="text-[14px] font-medium text-[#8b95a1]">
              {searchQuery ? "검색 결과와 일치하는 제품이 없습니다." : "해당 제조사에 등록된 제품이 없습니다."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {pagedProducts.map((product, idx) => {
              const elements = [];
              
              elements.push(
                <ProductCard
                  key={product.id}
                  {...product}
                  selected={selection.product === product.id}
                  onClick={() => setSelection({ ...selection, product: product.id, container: null })}
                  onPreview={() => setPreviewProduct(product)}
                />
              );

              // If this is the insertion point and we have a selected product in the current paged view
              if (idx === insertIndex - 1 || (idx === pagedProducts.length - 1 && insertIndex > pagedProducts.length)) {
                if (selectedProductData) {
                  elements.push(
                    <div key="info-box" className="col-span-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="rounded-[16px] bg-[#001a41] p-5 text-white">
                        <div className="flex items-center gap-3.5 mb-5">
                          <div className="relative h-9 w-9 overflow-hidden rounded-[8px] border border-white/10 bg-white/5 shrink-0">
                            {selectedProductData.image && (
                              <Image 
                                src={selectedProductData.image} 
                                alt={selectedProductData.name} 
                                fill 
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <h4 className="text-[15px] font-bold">{selectedProductData.name}</h4>
                            <p className="text-[12px] text-white/60">{selectedProductData.category}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <h5 className="text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2.5">Key Features</h5>
                            <ul className="space-y-1.5">
                              {(selectedProductData.keyFeatures || []).map((feature, i) => (
                                <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed">
                                  <Check className="h-3 w-3 text-[#0052cc] shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2.5">Ingredients</h5>
                            <ul className="space-y-1.5">
                              {(selectedProductData.ingredients || []).map((ingredient, i) => (
                                <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-white/80">
                                  <span className="mt-1.5 h-1 w-1 rounded-full bg-white/40 shrink-0" />
                                  <span>{ingredient}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              }

              return elements;
            })}
          </div>
        )}
      </div>

      {previewProduct && <ProductPreviewModal product={previewProduct} onClose={() => setPreviewProduct(null)} />}
    </>
  );
}
