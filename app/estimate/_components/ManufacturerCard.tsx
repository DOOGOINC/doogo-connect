import Image from "next/image";
import { Check, MapPin, Star } from "lucide-react";

export function ManufacturerCard({ name, location, rating, tags, image, desc, selected, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`group grid w-full grid-cols-[100px_1fr_auto] items-center gap-5 rounded-[10px] border p-4 text-left transition-all ${selected
        ? "border-[#3182f6] bg-[#f2f8ff] shadow-[0_4px_20px_rgba(49,130,246,0.12)]"
        : "border-[#e5e8eb] bg-white hover:border-[#3182f6] hover:shadow-md"
        }`}
    >
      <div className="relative h-[100px] w-[100px] overflow-hidden rounded-[8px] border border-[#f2f4f6] bg-[#f7f9fa]">
        <Image
          src={image}
          alt={name}
          fill
          sizes="100px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="min-w-0 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[16px] font-bold tracking-tight text-[#191f28]">{name}</h3>
          <div className="flex items-center gap-2">
            {/* <span className="flex items-center gap-1 text-[12px] font-bold text-[#ffd400]">
              <Star className="h-3.5 w-3.5 fill-current" />
              {rating}
            </span> */}
            <span className="h-3 w-[1px] bg-[#e5e8eb]" />
            <span className="flex items-center gap-1 text-[12px] font-medium text-[#8b95a1]">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-[12px] leading-[1.5] text-[#4e5968]">
          {desc}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className="rounded-[4px] bg-[#f2f4f6] px-2 py-0.5 text-[11px] font-medium text-[#6b7684]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${selected ? "border-[#3182f6] bg-[#3182f6]" : "border-[#d1d6db] bg-white"
          }`}
      >
        {selected && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
    </button>
  );
}
