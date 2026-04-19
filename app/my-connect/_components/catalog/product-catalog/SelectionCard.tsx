import { Check } from "lucide-react";

type SelectionCardProps = {
  title: string;
  selected: boolean;
  subtitle?: string;
  onClick: () => void;
};

export function SelectionCard({ title, selected, subtitle, onClick }: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between rounded-[12px] border px-4 py-3.5 text-left transition-all ${
        selected 
          ? "border-[#3182F6] bg-[#F2F8FF] ring-1 ring-[#3182F6]" 
          : "border-[#E5E8EB] bg-white hover:border-[#3182F6] hover:shadow-sm"
      }`}
    >
      <div className="min-w-0 pr-4">
        <p className={`truncate text-[14px] font-bold ${selected ? "text-[#3182F6]" : "text-[#191F28]"}`}>
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 truncate text-[12px] text-[#8B95A1] group-hover:text-[#4E5968]">
            {subtitle}
          </p>
        )}
      </div>
      <div 
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-[#3182F6] bg-[#3182F6] text-white" : "border-[#D1D5DB] bg-white text-transparent"
        }`}
      >
        <Check className="h-3 w-3 stroke-[3]" />
      </div>
    </button>
  );
}
