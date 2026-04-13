/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Edit, Factory, Loader2, MapPin, Package, Plus, Tag, Trash2, Upload } from "lucide-react";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";
import { CatalogModal } from "@/app/my-connect/_components/catalog/CatalogModal";
import { CatalogToast } from "@/app/my-connect/_components/catalog/CatalogToast";

interface Manufacturer {
  id?: number;
  owner_id: string | null;
  name: string;
  location: string;
  address: string;
  rating: number;
  description: string;
  tags: string[];
  products: string[];
  image: string;
  logo: string;
}

interface OwnerProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "master" | "manufacturer" | "member";
}

type UploadError = {
  message: string;
};

const initialForm: Manufacturer = {
  owner_id: null,
  name: "",
  location: "",
  address: "",
  rating: 4.9,
  description: "",
  tags: [],
  products: [],
  image: "",
  logo: "",
};

export function ManufacturerAdmin() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [ownerProfiles, setOwnerProfiles] = useState<OwnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [tagsString, setTagsString] = useState("");
  const [productsString, setProductsString] = useState("");
  const [formData, setFormData] = useState<Manufacturer>(initialForm);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isEdit = editingId !== null;

  const resetForm = () => {
    setOpen(false);
    setEditingId(null);
    setFormData(initialForm);
    setTagsString("");
    setProductsString("");
    setUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const fetchManufacturers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("manufacturers").select("*").order("id", { ascending: true });

    if (error) {
      console.error("Fetch error:", error);
    } else {
      const formattedData = (data || []).map((manufacturer) => ({
        ...manufacturer,
        owner_id: manufacturer.owner_id || null,
        address: manufacturer.address || "",
        tags: Array.isArray(manufacturer.tags) ? manufacturer.tags : [],
        products: Array.isArray(manufacturer.products) ? manufacturer.products : [],
      }));
      setManufacturers(formattedData);
    }
    setLoading(false);
  }, []);

  const fetchOwnerProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("role", "manufacturer")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Owner profiles fetch error:", error);
      return;
    }

    setOwnerProfiles((data || []) as OwnerProfile[]);
  }, []);

  useEffect(() => {
    void Promise.all([fetchManufacturers(), fetchOwnerProfiles()]);
  }, [fetchManufacturers, fetchOwnerProfiles]);

  const uploadFile = async (file: File, assetType: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", assetType);

    const response = await authFetch("/api/admin/manufacturers/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as { error?: string; publicUrl?: string };

    if (!response.ok || !payload.publicUrl) {
      throw new Error(payload.error || "업로드에 실패했습니다.");
    }

    return payload.publicUrl;
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "logo"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, type);
      setFormData((prev) => ({ ...prev, [type]: url }));
      alert(`${type === "image" ? "배경 이미지" : "로고"} 업로드 성공!`);
    } catch (err: unknown) {
      const uploadError = err as UploadError;
      alert(
        `업로드 실패: ${uploadError.message}\n(Storage에 'manufacturers' 버킷이 있고 Public 정책이 설정되어 있는지 확인해주세요.)`
      );
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert("제조사명을 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        owner_id: formData.owner_id,
        name: formData.name,
        location: formData.location,
        address: formData.address,
        rating: formData.rating,
        description: formData.description,
        tags: tagsString
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        products: productsString
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        image: formData.image,
        logo: formData.logo,
      };

      if (editingId) {
        const response = await authFetch(`/api/admin/manufacturers/${editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || "save_failed");
      } else {
        const response = await authFetch("/api/admin/manufacturers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || "save_failed");
      }

      await Promise.all([fetchManufacturers(), fetchOwnerProfiles()]);
      resetForm();
      setToastMessage(editingId ? "제조사 정보가 수정되었습니다." : "새 제조사가 등록되었습니다.");
    } catch (err: unknown) {
      const saveError = err as UploadError;
      alert(`저장 실패: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (manufacturer: Manufacturer) => {
    setFormData({
      ...initialForm,
      ...manufacturer,
      address: manufacturer.address || "",
    });
    setEditingId(manufacturer.id || null);
    setTagsString(Array.isArray(manufacturer.tags) ? manufacturer.tags.join(", ") : "");
    setProductsString(Array.isArray(manufacturer.products) ? manufacturer.products.join(", ") : "");
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("정말로 이 제조사를 삭제하시겠습니까?")) return;

    const response = await authFetch(`/api/admin/manufacturers/${id}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      alert("삭제 실패: " + (result.error || "unknown_error"));
      return;
    }

    await fetchManufacturers();
  };

  const ownerLabelMap = new Map(
    ownerProfiles.map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email?.trim() || profile.id,
    ])
  );

  const usedOwnerIds = new Set(
    manufacturers
      .filter((manufacturer) => manufacturer.owner_id && manufacturer.id !== editingId)
      .map((manufacturer) => manufacturer.owner_id as string)
  );

  const availableOwnerProfiles = ownerProfiles.filter((profile) => {
    if (formData.owner_id === profile.id) return true;
    return !usedOwnerIds.has(profile.id);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
      {toastMessage ? <CatalogToast message={toastMessage} onClose={() => setToastMessage("")} /> : null}

      <div className="mx-auto max-w-[1100px] space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#191F28]">제조사 관리</h1>
            <p className="mt-1 text-sm text-[#4E5968]">제조사 등록, 수정, 계정 연결을 한 곳에서 관리합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData(initialForm);
              setTagsString("");
              setProductsString("");
              setEditingId(null);
              setOpen(true);
            }}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#3182F6] px-5 text-[14px] font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-[#1B64DA]"
          >
            <Plus className="h-4 w-4" />
            새 제조사 등록
          </button>
        </div>

        <CatalogModal
          open={open}
          onClose={resetForm}
          badge={isEdit ? "제조사 수정" : "제조사 등록"}
          title={isEdit ? "제조사 정보를 수정합니다" : "새 제조사를 등록합니다"}
          description=""
          maxWidthClassName="max-w-5xl"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="h-12 rounded-[14px] border border-[#D8E0E8] bg-white px-6 text-[14px] font-semibold text-[#4E5968] transition hover:bg-[#F8FAFC]"
              >
                취소하기
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || uploading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#191F28] px-7 text-[14px] font-semibold text-white transition hover:bg-black disabled:bg-[#CBD5E1]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isEdit ? "수정 완료하기" : "제조사 신규 등록하기"}
              </button>
            </div>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-[24px] border border-[#E7EDF3] bg-[#FCFDFE] p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#4E5968]">제조사명</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="예: (주)두고바이오"
                      className="h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#4E5968]">연결 계정</label>
                    <select
                      value={formData.owner_id || ""}
                      onChange={(e) => setFormData({ ...formData, owner_id: e.target.value || null })}
                      className="h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
                    >
                      <option value="">연결 안 함</option>
                      {availableOwnerProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {(profile.full_name || profile.email || profile.id) + ` (${profile.role})`}
                        </option>
                      ))}
                    </select>
                    <p className="text-[12px] text-[#8B95A1]">이미 다른 제조사에 연결된 계정은 제외됩니다.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#4E5968]">위치</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="예: 뉴질랜드 오클랜드"
                      className="h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#4E5968]">주소</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="예: 서울시 강남구 테헤란로 123"
                      className="h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#4E5968]">태그 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={tagsString}
                      onChange={(e) => setTagsString(e.target.value)}
                      placeholder="예: GMP, FDA, HACCP"
                      className="h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[13px] font-semibold text-[#4E5968]">제조 가능 제품 (쉼표로 구분)</label>
                    <input
                      type="text"
                      value={productsString}
                      onChange={(e) => setProductsString(e.target.value)}
                      placeholder="예: 캡슐, 정제, 파우치"
                      className="h-12 w-full rounded-[14px] border border-[#D8E0E8] bg-white px-4 text-[14px] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[13px] font-semibold text-[#4E5968]">상세 설명</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="제조사에 대한 상세 설명을 입력해주세요."
                      className="h-28 w-full resize-none rounded-[14px] border border-[#D8E0E8] bg-white p-4 text-[14px] outline-none transition focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[24px] border border-[#E7EDF3] bg-[#FCFDFE] p-5">
                <p className="text-[15px] font-semibold text-[#191F28]">배경 이미지</p>
                <div className="mt-4 flex h-44 items-center justify-center overflow-hidden rounded-[20px] border border-[#E5E8EB] bg-white">
                  {formData.image ? (
                    <img src={formData.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-7 w-7 text-[#B8C4D1]" />
                  )}
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => imageInputRef.current?.click()}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#191F28] px-4 text-[13px] font-semibold text-white transition hover:bg-black"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  배경 이미지
                </button>
                <input ref={imageInputRef} type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, "image")} />
              </section>

              <section className="rounded-[24px] border border-[#E7EDF3] bg-[#FCFDFE] p-5">
                <p className="text-[15px] font-semibold text-[#191F28]">로고 이미지</p>
                <div className="mt-4 flex h-44 items-center justify-center overflow-hidden rounded-[20px] border border-[#E5E8EB] bg-white p-4">
                  {formData.logo ? (
                    <img src={formData.logo} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Factory className="h-7 w-7 text-[#B8C4D1]" />
                  )}
                </div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => logoInputRef.current?.click()}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#D8E0E8] bg-white px-4 text-[13px] font-semibold text-[#4E5968] transition hover:bg-[#F8FAFC]"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  로고 이미지
                </button>
                <input ref={logoInputRef} type="file" hidden accept="image/*" onChange={(e) => handleFileChange(e, "logo")} />
              </section>
            </div>
          </div>
        </CatalogModal>

        {loading ? (
          <div className="flex flex-1 items-center justify-center rounded-[28px] border border-[#F2F4F6] bg-white py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#0064FF]" />
          </div>
        ) : (
          <div className="grid gap-4">
            {manufacturers.length === 0 ? (
              <div className="rounded-2xl border border-[#F2F4F6] bg-white p-12 text-center font-medium text-[#8B95A1]">
                등록된 제조사가 없습니다.
              </div>
            ) : (
              manufacturers.map((manufacturer) => (
                <div
                  key={manufacturer.id}
                  className="group flex items-center justify-between rounded-2xl border border-[#F2F4F6] bg-white p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-5">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-[#F8F9FA] p-2">
                      {manufacturer.logo ? (
                        <img src={manufacturer.logo} alt={manufacturer.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <Factory className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#191F28]">{manufacturer.name}</h3>
                        <span className="rounded-full bg-[#E6F0FF] px-2 py-0.5 text-xs font-bold text-[#0064FF]">
                          평점 {manufacturer.rating}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[#8B95A1]">
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" /> {manufacturer.location}
                        </span>
                        <span className="text-sm">주소: {manufacturer.address || "-"}</span>
                        <span className="flex items-center gap-1 text-sm">
                          <Tag className="h-3 w-3" />{" "}
                          {manufacturer.tags.length > 0 ? manufacturer.tags.slice(0, 3).join(", ") : "태그 없음"}
                        </span>
                        <span className="flex items-center gap-1 text-sm">
                          <Package className="h-3 w-3" />{" "}
                          {manufacturer.products.length > 0 ? manufacturer.products.slice(0, 2).join(", ") : "품목 없음"}
                        </span>
                        <span className="text-sm">
                          연결 계정: {manufacturer.owner_id ? ownerLabelMap.get(manufacturer.owner_id) || manufacturer.owner_id : "미연결"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(manufacturer)}
                      className="rounded-xl p-3 text-[#4E5968] transition-colors hover:bg-[#F2F4F6]"
                      title="수정"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => manufacturer.id && handleDelete(manufacturer.id)}
                      className="rounded-xl p-3 text-red-400 transition-colors hover:bg-red-50"
                      title="삭제"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
