"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";

type PartnerStatus = "active" | "inactive";

type PartnerRow = {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  commissionRate: number;
  status: PartnerStatus;
  createdAt: string;
  deletedAt: string | null;
};

type PartnerForm = {
  name: string;
  email: string;
  temporaryPassword: string;
  referralCode: string;
  commissionRate: string;
};

type PartnerResponse = {
  success?: boolean;
  partners?: PartnerRow[];
  error?: string;
};

const EMPTY_FORM: PartnerForm = {
  name: "",
  email: "",
  temporaryPassword: "",
  referralCode: "",
  commissionRate: "2",
};

function normalizeCommissionRate(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 2;
  return Math.max(0, Math.min(100, Number(numeric.toFixed(2))));
}

function toDisplayDate(value: string) {
  return new Date(value)
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\.\s?/g, "-")
    .replace(/-$/, "");
}

function PartnerEditModal({
  partner,
  form,
  saving,
  error,
  onClose,
  onDelete,
  onSave,
  onFormChange,
  status,
  onStatusChange,
}: {
  partner: PartnerRow;
  form: PartnerForm;
  saving: boolean;
  error: string;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  onFormChange: (patch: Partial<PartnerForm>) => void;
  status: PartnerStatus;
  onStatusChange: (next: PartnerStatus) => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 py-6">
      <div className="w-full max-w-[500px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="flex items-center justify-between bg-[#2554dd] px-5 py-4 text-white">
          <h2 className="text-[17px] font-bold">🤝 파트너 수정 - {partner.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 pb-5 pt-5">
          <label className="block">
            <span className="mb-2 block text-[12px] font-bold text-[#667085]">이름</span>
            <input
              value={form.name}
              onChange={(event) => onFormChange({ name: event.target.value })}
              className="h-11 w-full rounded-[18px] border border-[#e7edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition focus:border-[#2f6bff]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-bold text-[#667085]">이메일</span>
            <input
              value={form.email}
              onChange={(event) => onFormChange({ email: event.target.value })}
              className="h-11 w-full rounded-[18px] border border-[#e7edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition focus:border-[#2f6bff]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-bold text-[#667085]">새 비밀번호 (선택)</span>
            <input
              value={form.temporaryPassword}
              onChange={(event) => onFormChange({ temporaryPassword: event.target.value })}
              placeholder="변경 시에만 입력"
              className="h-11 w-full rounded-[18px] border border-[#e7edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition placeholder:text-[#a4acb9] focus:border-[#2f6bff]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-bold text-[#667085]">추천인 코드 (영문)</span>
            <input
              value={form.referralCode}
              onChange={(event) => onFormChange({ referralCode: event.target.value.toUpperCase() })}
              placeholder="예: PARTNER001"
              className="h-11 w-full rounded-[18px] border border-[#e7edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition placeholder:text-[#a4acb9] focus:border-[#2f6bff]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-bold text-[#667085]">수수료 (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.commissionRate}
              onChange={(event) => onFormChange({ commissionRate: event.target.value })}
              className="h-11 w-full rounded-[18px] border border-[#e7edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition focus:border-[#2f6bff]"
            />
          </label>

          <div>
            <span className="mb-2 block text-[12px] font-bold text-[#667085]">상태</span>
            <div className="inline-flex rounded-full bg-[#f3f5f9] p-1">
              <button
                type="button"
                onClick={() => onStatusChange("active")}
                className={`h-9 min-w-[92px] rounded-full px-5 text-[12px] font-bold transition ${status === "active" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#808898]"
                  }`}
              >
                활성
              </button>
              <button
                type="button"
                onClick={() => onStatusChange("inactive")}
                className={`h-9 min-w-[92px] rounded-full px-5 text-[12px] font-bold transition ${status === "inactive" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#808898]"
                  }`}
              >
                비활성
              </button>
            </div>
          </div>

          {partner.deletedAt ? (
            <p className="text-[12px] font-bold text-[#d97706]">삭제 처리된 계정입니다. 30일 후 목록에서 숨겨집니다.</p>
          ) : null}
          {error ? <p className="text-[12px] font-bold text-[#dc2626]">{error}</p> : null}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex h-11 flex-1 items-center justify-center rounded-[17px] bg-[#2f64f5] px-5 text-[14px] font-bold text-white transition hover:bg-[#2457df] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "저장"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={saving || Boolean(partner.deletedAt)}
              className="flex h-11 items-center justify-center rounded-[17px] bg-[#fff1f1] px-6 text-[14px] font-bold text-[#ff3b30] transition hover:bg-[#ffe5e5] disabled:opacity-50"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 flex-1 items-center justify-center rounded-[17px] bg-[#f1f3f7] px-5 text-[14px] font-bold text-[#5f6673] transition hover:bg-[#e8ecf3]"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MasterPartnerManagement() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);
  const [editingForm, setEditingForm] = useState<PartnerForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [editingPartner, setEditingPartner] = useState<PartnerRow | null>(null);
  const [editingStatus, setEditingStatus] = useState<PartnerStatus>("active");

  const partnerCount = partners.length;

  const sortedPartners = useMemo(
    () => [...partners].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [partners]
  );

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await authFetch("/api/admin/partners");
        const payload = (await response.json()) as PartnerResponse;

        if (!response.ok || !payload.partners) {
          throw new Error(payload.error || "파트너 목록을 불러오지 못했습니다.");
        }

        setPartners(payload.partners);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "파트너 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void fetchPartners();
  }, []);

  const handleCreate = async () => {
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPassword = form.temporaryPassword.trim();
    const trimmedReferralCode = form.referralCode.trim();

    if (!trimmedName || !trimmedEmail) {
      setError("이름과 이메일을 입력해 주세요.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setError("임시 비밀번호는 6자 이상 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await authFetch("/api/admin/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          temporaryPassword: trimmedPassword,
          referralCode: trimmedReferralCode,
          commissionRate: normalizeCommissionRate(form.commissionRate),
          status: "active",
        }),
      });
      const payload = (await response.json()) as PartnerResponse;

      if (!response.ok || !payload.partners) {
        throw new Error(payload.error || "파트너 생성에 실패했습니다.");
      }

      setPartners(payload.partners);
      setForm(EMPTY_FORM);
      setMessage("파트너가 생성되었습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "파트너 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (partner: PartnerRow) => {
    setEditingPartner(partner);
    setEditingStatus(partner.status);
    setModalError("");
    setEditingForm({
      name: partner.name,
      email: partner.email,
      temporaryPassword: "",
      referralCode: partner.referralCode,
      commissionRate: String(partner.commissionRate),
    });
  };

  const closeEditModal = () => {
    setEditingPartner(null);
    setEditingStatus("active");
    setEditingForm(EMPTY_FORM);
    setModalError("");
  };

  const handleEditSave = async () => {
    if (!editingPartner) return;

    const trimmedName = editingForm.name.trim();
    const trimmedEmail = editingForm.email.trim();
    const trimmedPassword = editingForm.temporaryPassword.trim();
    const trimmedReferralCode = editingForm.referralCode.trim();

    if (!trimmedName || !trimmedEmail) {
      setModalError("이름과 이메일을 입력해 주세요.");
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      setModalError("비밀번호를 변경하려면 6자 이상 입력해 주세요.");
      return;
    }

    setSaving(true);
    setModalError("");
    setMessage("");
    setError("");

    try {
      const response = await authFetch("/api/admin/partners", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingPartner.id,
          name: trimmedName,
          email: trimmedEmail,
          temporaryPassword: trimmedPassword,
          referralCode: trimmedReferralCode,
          commissionRate: normalizeCommissionRate(editingForm.commissionRate),
          status: editingStatus,
        }),
      });
      const payload = (await response.json()) as PartnerResponse;

      if (!response.ok || !payload.partners) {
        throw new Error(payload.error || "파트너 수정에 실패했습니다.");
      }

      setPartners(payload.partners);
      setMessage("파트너 정보가 수정되었습니다.");
      closeEditModal();
    } catch (submitError) {
      setModalError(submitError instanceof Error ? submitError.message : "파트너 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingPartner) return;

    setSaving(true);
    setModalError("");
    setMessage("");
    setError("");

    try {
      const response = await authFetch("/api/admin/partners", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingPartner.id,
        }),
      });
      const payload = (await response.json()) as PartnerResponse;

      if (!response.ok || !payload.partners) {
        throw new Error(payload.error || "파트너 삭제 처리에 실패했습니다.");
      }

      setPartners(payload.partners);
      setMessage("파트너 계정이 비활성 처리되었습니다. 30일 후 목록에서 사라집니다.");
      closeEditModal();
    } catch (deleteError) {
      setModalError(deleteError instanceof Error ? deleteError.message : "파트너 삭제 처리에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#f7f8fa]">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 overflow-y-auto bg-[#f7f8fa] px-5 py-5">
        <div className="w-full">
          <header className="mb-5">
            <h1 className="text-[20px] font-bold tracking-tight text-[#1f2a44]">🤝 파트너 관리</h1>
            <p className="mt-1 text-[12px] font-medium text-[#8a94a6]">두고커넥트 운영 관리 시스템</p>
          </header>

          <div className="mb-5 rounded-[14px] border border-[#d7e6ff] bg-[#eef5ff] px-4 py-3 text-[12px] font-semibold text-[#4c74ff]">
            💡 파트너는 이메일/비밀번호로 파트너센터에 로그인합니다. 기본 수수료는 2%이며 개별 조정 가능합니다.
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(120px,0.56fr)_minmax(0,1.44fr)]">
            <section className="rounded-[14px] border border-[#e8edf4] bg-white px-5 py-5 shadow-sm">
              <h2 className="text-[14px] font-bold text-[#20293f]">🤝 새 파트너 생성</h2>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold text-[#667085]">이름</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="김파트너"
                    className="h-11 w-full rounded-[18px] border border-[#e8edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition placeholder:text-[#a4acb9] focus:border-[#2f6bff]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold text-[#667085]">이메일 (로그인 ID)</span>
                  <input
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="partner@example.com"
                    className="h-11 w-full rounded-[18px] border border-[#e8edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition placeholder:text-[#a4acb9] focus:border-[#2f6bff]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold text-[#667085]">임시 비밀번호</span>
                  <input
                    value={form.temporaryPassword}
                    onChange={(event) => setForm((prev) => ({ ...prev, temporaryPassword: event.target.value }))}
                    placeholder="초기 비밀번호"
                    className="h-11 w-full rounded-[18px] border border-[#e8edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition placeholder:text-[#a4acb9] focus:border-[#2f6bff]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold text-[#667085]">추천인 코드 (영문)</span>
                  <input
                    value={form.referralCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, referralCode: event.target.value.toUpperCase() }))}
                    placeholder="예: PARTNER001"
                    className="h-11 w-full rounded-[18px] border border-[#e8edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition placeholder:text-[#a4acb9] focus:border-[#2f6bff]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-bold text-[#667085]">수수료 % (기본: 2%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.commissionRate}
                    onChange={(event) => setForm((prev) => ({ ...prev, commissionRate: event.target.value }))}
                    className="h-11 w-full rounded-[18px] border border-[#e8edf4] bg-white px-4 text-[12px] font-medium text-[#344054] outline-none transition focus:border-[#2f6bff]"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={saving}
                  className="mt-1 flex h-11 w-full items-center justify-center rounded-[18px] bg-[#2f64f5] px-5 text-[14px] font-bold text-white transition hover:bg-[#2457df] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "파트너 생성"}
                </button>

                {message ? <p className="text-[12px] font-bold text-[#16a34a]">{message}</p> : null}
                {error ? <p className="text-[12px] font-bold text-[#dc2626]">{error}</p> : null}
              </div>
            </section>

            <section className="rounded-[14px] border border-[#e8edf4] bg-white px-5 py-5 shadow-sm">
              <h2 className="text-[14px] font-bold text-[#20293f]">파트너 목록 ({partnerCount}명)</h2>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[720px] w-full table-fixed text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[12px] font-bold text-[#667085]">
                      <th className="w-[15%] px-3 py-3">이름</th>
                      <th className="w-[30%] px-3 py-3">이메일</th>
                      <th className="w-[15%] px-3 py-3">추천인코드</th>
                      <th className="w-[15%] px-3 py-3">생성일</th>
                      <th className="w-[80px] px-3 py-3 text-center">수수료</th>
                      <th className="w-[90px] px-3 py-3 text-center">상태</th>
                      <th className="w-[80px] px-3 py-3 text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPartners.map((partner) => (
                      <tr key={partner.id} className="border-b border-[#f2f4f7] last:border-b-0 hover:bg-[#f9fafb] transition-colors">
                        <td className="px-3 py-3 text-[12px] font-bold text-[#344054]">
                          <div className="truncate" title={partner.name}>{partner.name}</div>
                        </td>
                        <td className="px-3 py-3 text-[12px] font-semibold text-[#475467]">
                          <div className="truncate" title={partner.email}>{partner.email}</div>
                        </td>
                        <td className="px-3 py-3 text-[12px] font-semibold text-[#667085]">
                          <div className="truncate">{partner.referralCode || "-"}</div>
                        </td>
                        <td className="px-3 py-3 text-[12px] font-semibold text-[#667085] whitespace-nowrap">
                          {toDisplayDate(partner.createdAt)}
                        </td>


                        <td className="px-3 py-3 text-[12px] font-bold text-[#344054] text-center">
                          {partner.commissionRate}%
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${partner.status === "active" ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#fef3c7] text-[#d97706]"
                              }`}
                          >
                            {partner.status === "active" ? "활성" : "비활성"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => openEditModal(partner)}
                              className="inline-flex items-center justify-center rounded-full bg-[#eef4ff] px-2.5 py-0.5 text-[11px] font-bold text-[#2f6bff] transition hover:bg-[#dfe9ff] whitespace-nowrap"
                            >
                              수정
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>

      {editingPartner ? (
        <PartnerEditModal
          partner={editingPartner}
          form={editingForm}
          saving={saving}
          error={modalError}
          onClose={closeEditModal}
          onDelete={() => void handleDelete()}
          onSave={() => void handleEditSave()}
          onFormChange={(patch) => setEditingForm((prev) => ({ ...prev, ...patch }))}
          status={editingStatus}
          onStatusChange={setEditingStatus}
        />
      ) : null}
    </>
  );
}
