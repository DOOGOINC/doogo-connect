import React from "react";

const partners = [
  { id: 1, src: "/image/client-logo-strip/img_2.png", alt: "Partner 1" },
  { id: 2, src: "/image/client-logo-strip/img_3.jfif", alt: "Partner 2" },
  { id: 3, src: "/image/client-logo-strip/img_4.jfif", alt: "Partner 3" },
  { id: 4, src: "/image/client-logo-strip/img_6.png", alt: "Partner 4" },
  { id: 5, src: "/image/client-logo-strip/img_7.jfif", alt: "Partner 5" },
];

export function ClientLogoStrip() {
  const doublePartners = [...partners, ...partners];

  return (
    <section className="py-6 bg-[#ffffff] overflow-hidden">
      {/* SPONSORED BY */}
      <div className="max-w-[1200px] mx-auto px-6 mb-8 text-center">
        <div className="flex items-center justify-center gap-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            SPONSORED BY
          </p>
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
