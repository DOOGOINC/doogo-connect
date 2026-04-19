import Image from "next/image";
import { Check, MapPin } from "lucide-react";

type ManufacturerCardProps = {
  name: string;
  location: string;
  tags: string[];
  image: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
  priority?: boolean;
};

export function ManufacturerCard({ name, location, tags, image, desc, selected, onClick, priority = false }: ManufacturerCardProps) {
  const imageSrc = typeof image === "string" ? image.trim() : "";

  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-start gap-6 rounded-[14px] border p-6 text-left transition-all ${selected
        ? "border-[#3182f6] bg-white ring-2 ring-[#005adb]"
        : "border-[#e5e8eb] border-2 bg-white hover:border-[#005adb]"
        }`}
    >
      <div className="relative h-[94px] w-[94px] shrink-0 overflow-hidden rounded-[12px] border border-[#f2f4f6]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name}
            fill
            sizes="94px"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#f7f9fa]">
            <MapPin className="h-6 w-6 text-[#d1d6db]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-8">
        <h3 className="text-[17px] font-bold tracking-tight text-[#191f28]">{name}</h3>
        <p className="mt-0.5 text-[14px] text-[#8b95a1]">{location}</p>

        <p className="mt-2 text-[14px] leading-[1.6] text-[#4e5968] line-clamp-2">
          {desc}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-[6px] bg-[#f2f4f6] px-2.5 py-1 text-[13px] font-medium text-[#6b7684]"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div
        className={`absolute right-6 top-6 flex h-7 w-7 items-center justify-center rounded-full border transition-all ${selected
          ? "border-[#005adb] bg-[#005adb]"
          : "border-[#e5e8eb] border-2 bg-white hidden group-hover:flex"
          }`}
      >
        {selected && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-white"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
        )}
      </div>
    </button>
  );
}
