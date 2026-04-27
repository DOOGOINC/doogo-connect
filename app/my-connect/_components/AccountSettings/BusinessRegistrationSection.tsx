"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Pencil, X } from "lucide-react";
import type { Profile } from "./types";

type BusinessFormState = {
  businessCompanyName: string;
  businessRegistrationNumber: string;
  businessOwnerName: string;
  businessType: string;
  businessItem: string;
  businessAddress: string;
};

interface BusinessRegistrationSectionProps {
  onProfileRefresh: () => Promise<void>;
  profile: Profile | null;
}

function toFormState(profile: Profile | null): BusinessFormState {
  return {
    businessCompanyName: profile?.business_company_name || "",
    businessRegistrationNumber: profile?.business_registration_number || "",
    businessOwnerName: profile?.business_owner_name || "",
    businessType: profile?.business_type || "",
    businessItem: profile?.business_item || "",
    businessAddress: profile?.business_address || "",
  };
}

function formatUploadedDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ko-KR").replace(/\.\s/g, "-").replace(".", "");
}

export function BusinessRegistrationSection({ onProfileRefresh, profile }: BusinessRegistrationSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<BusinessFormState>(() => toFormState(profile));

  useEffect(() => {
    if (!isOpen) {
      setForm(toFormState(profile));
      setSelectedFile(null);
      setError("");
    }
  }, [isOpen, profile]);

  const attachmentLabel = useMemo(() => {
    if (selectedFile) return `${selectedFile.name} (첨부됨)`;
    if (profile?.business_attachment_name) return `${profile.business_attachment_name} (첨부됨)`;
    return "첨부된 사업자등록증이 없습니다.";
  }, [profile?.business_attachment_name, selectedFile]);

  const handleSave = async () => {
    const requiredValues = Object.values(form).map((value) => value.trim());
    if (requiredValues.some((value) => !value)) {
      setError("모든 사업자 정보를 입력해 주세요.");
      return;
    }

    const payload = new FormData();
    payload.append("businessCompanyName", form.businessCompanyName.trim());
    payload.append("businessRegistrationNumber", form.businessRegistrationNumber.trim());
    payload.append("businessOwnerName", form.businessOwnerName.trim());
    payload.append("businessType", form.businessType.trim());
    payload.append("businessItem", form.businessItem.trim());
    payload.append("businessAddress", form.businessAddress.trim());
    if (selectedFile) {
      payload.append("attachment", selectedFile);
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/profile/business-registration", {
        method: "POST",
        body: payload,
        credentials: "include",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "사업자 정보 저장에 실패했습니다.");
      }

      await onProfileRefresh();
      setIsOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "사업자 정보 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const infoRows = [
    { label: "법인명", value: profile?.business_company_name || "-" },
    { label: "사업자등록번호", value: profile?.business_registration_number || "-" },
    { label: "대표자명", value: profile?.business_owner_name || "-" },
    { label: "업태", value: profile?.business_type || "-" },
    { label: "종목", value: profile?.business_item || "-" },
    { label: "사업장 소재지", value: profile?.business_address || "-" },
  ];

  return (
    <>
      <section className="mb-6 rounded-[24px] border border-[#e9edf3] bg-white p-8 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="mb-7 flex items-center justify-between gap-4">
          <h2 className="text-[18px] font-extrabold text-[#111827]">사업자 등록 정보</h2>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-5 py-3 text-[15px] font-bold text-[#2f6bff] transition hover:bg-[#e3edff]"
          >
            <Pencil className="h-4 w-4" />
            수정
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {infoRows.map((row) => (
            <div key={row.label} className="rounded-[24px] bg-[#f7f9fc] px-5 py-5">
              <p className="text-[14px] font-medium text-[#9aa4b5]">{row.label}</p>
              <p className="mt-2 break-keep text-[18px] font-extrabold leading-8 text-[#16233b]">{row.value}</p>
            </div>
          ))}
        </div>

        {profile?.business_attachment_name ? (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-[22px] border border-[#a7f3c7] bg-[#effcf4] px-6 py-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe7ff] text-[#b09ad8]">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-extrabold text-[#007a3d]">사업자등록증 첨부됨</p>
                <p className="mt-1 truncate text-[15px] font-medium text-[#00a85a]">
                  {profile.business_attachment_name}
                  {profile.business_attachment_uploaded_at ? ` · ${formatUploadedDate(profile.business_attachment_uploaded_at)} 업로드` : ""}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4 py-8">

          <div className="w-full max-w-[520px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">

            <div className="flex items-center justify-between border-b border-[#edf1f5] px-6 py-4">
              <h3 className="text-[16px] font-extrabold text-[#111827]">사업자 정보 수정</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-[#98a2b3] transition hover:bg-[#f4f6f8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {[
                  { key: "businessCompanyName", label: "법인명" },
                  { key: "businessRegistrationNumber", label: "사업자등록번호" },
                  { key: "businessOwnerName", label: "대표자명" },
                  { key: "businessType", label: "업태" },
                  { key: "businessItem", label: "종목" },
                  { key: "businessAddress", label: "사업장 소재지", colSpan: true },
                ].map((field) => (
                  <div key={field.key} className={field.colSpan ? "col-span-2" : ""}>
                    <label className="mb-1.5 block text-[13px] font-bold text-[#8b95a1]">{field.label}</label>
                    <input
                      value={form[field.key as keyof BusinessFormState]}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="h-10 w-full rounded-[12px] border border-[#e5e7eb] bg-white px-4 text-[14px] font-medium text-[#111827] outline-none transition focus:border-[#2f6bff] focus:ring-4 focus:ring-[#eef4ff]"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-[#8b95a1]">사업자등록증 첨부</label>
                <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#a7f3c7] bg-[#effcf4] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#efe7ff] text-[#b09ad8]">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <p className="truncate text-[14px] font-bold text-[#00a85a]">{attachmentLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-shrink-0 rounded-full border border-[#c7d7ff] bg-white px-3 py-1.5 text-[13px] font-bold text-[#2f6bff] transition hover:bg-[#f8fbff]"
                  >
                    변경
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                </div>
              </div>

              {error ? <p className="text-xs font-semibold text-[#e5484d]">{error}</p> : null}

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="mt-2 h-12 w-full rounded-[16px] bg-[#2f6bff] text-[16px] font-extrabold text-white transition hover:bg-[#1f5af0] disabled:cursor-not-allowed disabled:bg-[#aab4c8]"
              >
                {isSaving ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
