"use client";

import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Paperclip, X } from "lucide-react";

interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PartnerModal({ isOpen, onClose }: PartnerModalProps) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    business_number: "",
    manager_name: "",
    manager_phone: "",
    manager_email: "",
    company_description: "",
  });

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      business_number: "",
      manager_name: "",
      manager_phone: "",
      manager_email: "",
      company_description: "",
    });
    setSelectedFile(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!formData.company_name || !formData.business_number || !formData.manager_name || !formData.manager_phone || !formData.manager_email) {
      alert("필수 항목을 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("company_name", formData.company_name);
      payload.append("business_number", formData.business_number);
      payload.append("manager_name", formData.manager_name);
      payload.append("manager_phone", formData.manager_phone);
      payload.append("manager_email", formData.manager_email);
      payload.append("company_description", formData.company_description);
      if (selectedFile) {
        payload.append("attachment", selectedFile);
      }

      const response = await fetch("/api/partner-requests", {
        method: "POST",
        body: payload,
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "문의 제출에 실패했습니다.");
      }

      alert("입점 문의가 접수되었습니다. 검토 후 연락드리겠습니다.");
      resetForm();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "문의 제출 중 오류가 발생했습니다.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      {/* max-w-[560px] -> [480px]로 축소 */}
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-[14px] bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* 상단 헤더 패딩 및 폰트 축소 */}
        <div className="bg-[#0064FF] p-5 text-white">
          <button
            onClick={onClose}
            type="button"
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-hover hover:bg-white/30"
          >
            <X size={20} />
          </button>
          <h2 className="text-[17px] font-bold">제조사 입점 문의</h2>
          <p className="mt-1 text-[13px] text-white/80">DOOGO Connect 파트너 제조사로 참여해 보세요.</p>
        </div>

        {/* 내부 패딩 및 요소 간격(gap-5 -> gap-4) 축소 */}
        <div className="max-h-[75vh] overflow-y-auto p-6 pt-5">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700">회사명*</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-[#0064FF] focus:bg-white transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700">사업자등록번호*</label>
                <input
                  type="text"
                  required
                  value={formData.business_number}
                  onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
                  className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-[#0064FF] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700">담당자명*</label>
                <input
                  type="text"
                  required
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-[#0064FF] focus:bg-white transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-slate-700">연락처*</label>
                <input
                  type="text"
                  required
                  value={formData.manager_phone}
                  onChange={(e) => setFormData({ ...formData, manager_phone: e.target.value })}
                  className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-[#0064FF] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-700">이메일*</label>
              <input
                type="email"
                required
                value={formData.manager_email}
                onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-[#0064FF] focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-700">회사 소개*</label>
              <textarea
                required
                value={formData.company_description}
                onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
                className="min-h-[80px] resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] outline-none focus:border-[#0064FF] focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-slate-700">회사 소개서 첨부 (PDF/PPT/DOC)</label>
              <button
                type="button"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all overflow-hidden relative"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : fileName ? (
                  <div className="flex items-center gap-2 font-bold text-[#0064FF]">
                    <CheckCircle2 size={16} />
                    <span className="max-w-[240px] truncate text-[13px]">{fileName}</span>
                  </div>
                ) : (
                  <>
                    <Paperclip size={16} />
                    <span className="text-[13px]">파일을 선택해 주세요.</span>
                  </>
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                hidden
                onChange={handleFileChange}
                accept=".pdf,.ppt,.pptx,.doc,.docx"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-12 rounded-lg bg-[#0064FF] text-[15px] text-white font-bold transition-all hover:bg-[#0052D4] disabled:opacity-60"
            >
              {loading ? "제출 중..." : "입점 문의 제출"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
