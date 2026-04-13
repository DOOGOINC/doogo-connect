import React from "react";

const partners = [
  { id: 1, src: "https://framerusercontent.com/images/eziJbtVdIE4oo9IJIKWO4QuTa8.png", alt: "Partner 1" },
  { id: 2, src: "https://framerusercontent.com/images/vLH1BeYFnn9sXQl0IKTfquKlc.png", alt: "Partner 2" },
  { id: 3, src: "https://framerusercontent.com/images/CJaOlKvBR5lrk6UCEyrIFOIw.png", alt: "Partner 3" },
  { id: 4, src: "https://framerusercontent.com/images/0LYiLdcYTrGs6HOrgB2R2sQBf4.png", alt: "Partner 4" },
  { id: 5, src: "https://framerusercontent.com/images/Ajf96McCiznkPIHwXOebfWHwQZ0.png", alt: "Partner 5" },
  { id: 6, src: "https://framerusercontent.com/images/2swzBXgfilSs0WY4E0dotSueUco.png", alt: "Partner 6" },
];

export function ClientLogoStrip() {
  // 무한 루프 효과를 위해 배열을 두 번 반복합니다.
  const doublePartners = [...partners, ...partners];

  return (
    <section className="py-12 bg-[#f9fafb] overflow-hidden">
      {/* SPONSORED BY */}
      <div className="max-w-[1200px] mx-auto px-6 mb-8 text-center">
        <div className="flex items-center justify-center gap-4">
          <div className="h-[1px] w-12 bg-gray-200"></div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">SPONSORED BY
          </p>
          <div className="h-[1px] w-12 bg-gray-200"></div>
        </div>
      </div>

      {/* 로고 슬라이드 영역 */}
      <div className="relative flex overflow-hidden group">
        <div className="flex animate-marquee whitespace-nowrap py-4 items-center">
          {doublePartners.map((partner, index) => (
            <div
              key={`${partner.id}-${index}`}
              className="mx-8 w-32 md:w-40 flex-shrink-0 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer"
            >
              <img
                src={partner.src}
                alt={partner.alt}
                className="w-full h-12 object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}