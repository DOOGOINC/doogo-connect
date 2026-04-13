"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface Profile {
  email: string;
  full_name: string;
  phone_number: string;
}

function isKakaoUser(user: User | null | undefined) {
  if (!user) return false;

  if (user.app_metadata?.provider === "kakao") {
    return true;
  }

  if (Array.isArray(user.app_metadata?.providers) && user.app_metadata.providers.includes("kakao")) {
    return true;
  }

  return (user.identities || []).some((identity) => identity.provider === "kakao");
}

export function AccountSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isPasswordSent, setIsPasswordSent] = useState(false);
  const [isSocialAccount, setIsSocialAccount] = useState(false);

  useEffect(() => {
    void fetchProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "USER_UPDATED") {
        window.alert("계정 정보가 업데이트되었습니다.");
        void fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      setIsSocialAccount(isKakaoUser(session.user));

      const { data, error } = await supabase
        .from("profiles")
        .select("email, full_name, phone_number")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email || isSocialAccount) return;

    if (!window.confirm("비밀번호 재설정 메일을 보내시겠습니까? 확인을 누르면 메일로 재설정 링크가 전송됩니다.")) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setIsPasswordSent(true);
      window.alert("비밀번호 재설정 메일을 발송했습니다. 메일함을 확인해 주세요.");
      setTimeout(() => setIsPasswordSent(false), 5000);
    } catch {
      window.alert("비밀번호 재설정 메일 발송에 실패했습니다.");
    }
  };

  const handleEmailUpdate = async () => {
    if (isSocialAccount) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    if (newEmail === profile?.email) {
      setEmailError("현재 이메일과 동일합니다.");
      return;
    }

    if (
      !window.confirm(
        `이메일을 ${newEmail}(으)로 변경하시겠습니까?\n변경 후 해당 이메일에서 인증을 완료해야 최종적으로 반영됩니다.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setIsEmailSent(true);
      setIsChangingEmail(false);
      window.alert(`${newEmail} 주소로 인증 메일을 보냈습니다. 메일에서 Confirm 버튼을 눌러야 최종 반영됩니다.`);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "이메일 변경에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
      <div className="mx-auto max-w-[800px]">
        <h1 className="mb-8 text-2xl font-bold text-[#191F28]">계정 설정</h1>

        <section className="mb-6 rounded-[24px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-[#191F28]">계정 정보</h2>

          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="mb-1 text-sm font-medium text-[#8B95A1]">이메일</p>
                {isChangingEmail ? (
                  <div className="mt-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => {
                        setNewEmail(event.target.value);
                        setEmailError("");
                      }}
                      placeholder="새 이메일 주소 입력"
                      className="h-12 w-full max-w-sm rounded-xl border border-[#E5E8EB] px-4 text-[15px] outline-none focus:border-[#0064FF] focus:ring-1 focus:ring-[#0064FF]"
                    />
                    {emailError ? <p className="mt-1 text-xs text-red-500">{emailError}</p> : null}
                    <div className="mt-3 flex gap-2">
                      <button onClick={handleEmailUpdate} className="rounded-lg bg-[#0064FF] px-4 py-2 text-sm font-semibold text-white">
                        변경 확인
                      </button>
                      <button
                        onClick={() => setIsChangingEmail(false)}
                        className="rounded-lg bg-[#F2F4F6] px-4 py-2 text-sm font-semibold text-[#4E5968]"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-[#333D4B]">{profile?.email}</span>
                    {isEmailSent ? (
                      <span className="flex items-center gap-1 rounded-full bg-[#E6FBF7] px-2 py-0.5 text-xs font-medium text-[#00D4B1] animate-pulse">
                        <CheckCircle2 className="h-3 w-3" /> 인증 대기 중
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {!isChangingEmail ? (
                <button
                  onClick={() => setIsChangingEmail(true)}
                  disabled={isSocialAccount}
                  className="rounded-lg border border-[#E5E8EB] px-4 py-2 text-sm font-semibold text-[#4E5968] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  변경하기
                </button>
              ) : null}
            </div>

            <div className="flex items-center justify-between border-t border-[#F9FAFB] pt-6">
              <div>
                <p className="mb-1 text-sm font-medium text-[#8B95A1]">비밀번호</p>
                <span className="text-[16px] font-semibold text-[#333D4B]">••••••••</span>
                {isPasswordSent ? (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[#00D4B1]">
                    <CheckCircle2 className="h-3 w-3" /> 재설정 메일 발송 완료
                  </p>
                ) : null}
              </div>
              <button
                onClick={handlePasswordReset}
                disabled={isSocialAccount}
                className="rounded-lg border border-[#E5E8EB] px-4 py-2 text-sm font-semibold text-[#4E5968] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                변경하기
              </button>
            </div>

            {isSocialAccount ? (
              <p className="rounded-2xl bg-[#FFF8E1] px-4 py-3 text-[13px] text-[#8A6D1F]">
                카카오 로그인 계정은 이메일과 비밀번호를 이 화면에서 변경할 수 없습니다.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-lg font-bold text-[#191F28]">기본 정보</h2>

          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium text-[#4E5968]">이름</p>
              <div className="flex h-14 w-full cursor-not-allowed items-center rounded-2xl bg-[#F2F4F6] px-5 text-[15px] font-medium text-[#8B95A1]">
                {profile?.full_name || "이름 정보 없음"}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[#4E5968]">연락처</p>
              <div className="flex h-14 w-full cursor-not-allowed items-center rounded-2xl bg-[#F2F4F6] px-5 text-[15px] font-medium text-[#8B95A1]">
                {profile?.phone_number || "연락처 정보 없음"}
              </div>
            </div>

            <p className="pt-2 text-[13px] text-[#8B95A1]">이름과 연락처 정보는 고객센터를 통해서만 변경 가능합니다.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
