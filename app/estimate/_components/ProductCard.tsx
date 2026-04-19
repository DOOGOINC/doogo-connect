import Image from "next/image";
import { Search } from "lucide-react";
import { formatCurrency, type CurrencyCode } from "@/lib/currency";

interface ProductCardProps {
  id: string;
  category: string;
  name: string;
  description: string;
  paymentCurrency: CurrencyCode;
  basePrice: number;
  image: string;
  selected: boolean;
  onClick: () => void;
  onPreview: () => void;
}

export function ProductCard({
  category,
  name,
  paymentCurrency,
  basePrice,
  image,
  selected,
  onClick,
  onPreview,
}: ProductCardProps) {
  const imageSrc = image?.trim() || null;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col w-full rounded-[14px] border bg-white text-left transition-all cursor-pointer overflow-hidden ${selected
        ? "border-[#0052cc] ring-1 ring-[#0052cc]"
        : "border-[#e5e8eb] border-2 hover:border-[#0052cc]"
        }`}
    >
      <div className="relative aspect-[2.4/1] w-full bg-[#f7f9fa]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Search className="h-5 w-5 text-[#d1d6db]" />
          </div>
        )}

        {/* Selected Checkmark */}
        <div
          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${selected
            ? "border-[#0052cc] bg-[#0052cc]"
            : "hidden"
            }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-2.5 w-2.5 text-white"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
        </div>

        {/* Preview Button */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview();
          }}
          className="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#191f28] shadow-sm transition-all hover:bg-[#f2f8ff] hover:text-[#0052cc]"
          aria-label={`${name} details`}
        >
          <Search className="h-3 w-3" />
        </button>
      </div>

      <div className="flex flex-col p-3">
        <h3 className="text-[14px] font-bold tracking-tight text-[#191f28] line-clamp-1">{name}</h3>
        <p className="text-[11px] text-[#8b95a1] line-clamp-1">{category}</p>

        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[14px] font-bold text-[#0052cc]">
            {formatCurrency(basePrice, paymentCurrency)}~
          </span>
          <span className="text-[12px] text-[#8b95a1]">/ 개</span>
        </div>
      </div>
    </div>
  );
}
