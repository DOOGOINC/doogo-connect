"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";

type CatalogModalProps = {
  open: boolean;
  title: string;
  description?: string;
  badge?: string;
  maxWidthClassName?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function CatalogModal({
  open,
  title,
  description,
  badge,
  maxWidthClassName = "max-w-4xl",
  onClose,
  children,
  footer,
}: CatalogModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/52 px-4 py-6 backdrop-blur-[3px]"
      role="presentation"
    >
      <div
        className={`relative flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-[28px] border border-[#DDE3EA] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] ${maxWidthClassName}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="border-b border-[#EEF2F6] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFF_100%)] px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              {badge ? (
                <span className="inline-flex items-center rounded-full bg-[#EEF5FF] px-3 py-1 text-[12px] font-semibold text-[#3182F6]">
                  {badge}
                </span>
              ) : null}
              <div>
                <h3 className="text-[22px] font-bold tracking-[-0.02em] text-[#191F28]">{title}</h3>
                {description ? (
                  <p className="mt-1 text-[14px] leading-6 text-[#667085]">{description}</p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E6EBF1] bg-white text-[#4E5968] transition hover:border-[#D6E4FF] hover:bg-[#F8FBFF] hover:text-[#191F28]"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">{children}</div>

        {footer ? <div className="border-t border-[#EEF2F6] bg-[#FCFDFE] px-6 py-4 sm:px-8">{footer}</div> : null}
      </div>
    </div>
  );
}
