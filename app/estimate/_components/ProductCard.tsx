import Image from "next/image";
import { Check, Search } from "lucide-react";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";

interface ProductCardProps {
  id: string;
  category: string;
  name: string;
  description: string;
  paymentCurrency: CurrencyCode;
  basePrice: number;
  image: string;
  discountConfig: Record<number, number>;
  selected: boolean;
  onClick: () => void;
  onPreview: () => void;
}

export function ProductCard({
  category,
  name,
  description,
  paymentCurrency,
  basePrice,
  image,
  selected,
  discountConfig,
  onClick,
  onPreview,
}: ProductCardProps) {
  const discountValues = Object.values(discountConfig || {});
  const maxPossibleDiscount = discountValues.length > 0 ? Math.max(...discountValues.map(Number)) : 0;

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={`group grid w-full grid-cols-[110px_1fr_auto] items-start gap-5 rounded-[12px] border p-4 text-left transition-all ${
        selected
          ? "border-[#3182f6] bg-[#f2f8ff] shadow-[0_4px_20px_rgba(49,130,246,0.12)]"
          : "border-[#e5e8eb] bg-white hover:border-[#3182f6] hover:shadow-md"
      }`}
    >
      <div className="relative h-[110px] w-[110px] overflow-hidden rounded-[8px] border border-[#f2f4f6] bg-[#f7f9fa]">
        <Image 
          src={image} 
          alt={name} 
          fill 
          className="object-cover transition-transform duration-500 group-hover:scale-105" 
        />
      </div>

      <div className="min-w-0 py-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#3182f6] uppercase tracking-wider">{category}</span>
          {maxPossibleDiscount > 0 && (
            <span className="rounded-[4px] bg-[#eaf3ff] px-1.5 py-0.5 text-[10px] font-bold text-[#3182f6]">
              최대 {maxPossibleDiscount}% 할인
            </span>
          )}
        </div>

        <h3 className="mt-1 text-[17px] font-bold tracking-tight text-[#191f28]">{name}</h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.5] text-[#4e5968]">{description}</p>

        <div className="mt-3 flex items-center gap-4">
          <div>
            <span className="text-[11px] font-medium text-[#8b95a1]">최소 수량</span>
            <p className="text-[13px] font-bold text-[#191f28]">50개</p>
          </div>
          <div className="h-6 w-[1px] bg-[#e5e8eb]" />
          <div>
            <span className="text-[11px] font-medium text-[#8b95a1]">기본 단가</span>
            <p className="text-[13px] font-bold text-[#191f28]">{formatCurrency(basePrice, paymentCurrency)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-3 self-center">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e8eb] bg-white text-[#8b95a1] transition-all hover:border-[#3182f6] hover:bg-[#f2f8ff] hover:text-[#3182f6]"
          aria-label={`${name} details`}
        >
          <Search className="h-4 w-4" />
        </button>

        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
            selected ? "border-[#3182f6] bg-[#3182f6]" : "border-[#d1d6db] bg-white"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5 text-white" />}
        </div>
      </div>
    </div>
  );
}
