"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle2 } from "lucide-react";

interface Profile {
  email: string;
  full_name: string;
  phone_number: string;
}

export function AccountSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isPasswordSent, setIsPasswordSent] = useState(false);

  useEffect(() => {
    fetchProfile();
    
    // 이메일 변경 완료 감지를 위한 auth 상태 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "USER_UPDATED") {
        alert("이메일 변경이 완료되었습니다.");
        fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
    if (!profile?.email) return;
    
    if (!window.confirm("비밀번호 재설정 메일을 발송하시겠습니까? 확인을 누르면 메일함으로 링크가 전송됩니다.")) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setIsPasswordSent(true);
      alert("비밀번호 재설정 메일이 발송되었습니다. 메일함을 확인해주세요.");
      setTimeout(() => setIsPasswordSent(false), 5000);
    } catch (err) {
      alert("비밀번호 재설정 메일 발송에 실패했습니다.");
    }
  };

  const handleEmailUpdate = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    if (newEmail === profile?.email) {
      setEmailError("현재 이메일과 동일합니다.");
      return;
    }

    if (!window.confirm(`이메일을 ${newEmail}(으)로 변경하시겠습니까?\n변경 후 새 이메일에서 인증을 완료해야 최종적으로 반영됩니다.`)) {
      return;
    }

    try {
      // Supabase 대시보드에서 "Secure email change"를 끄면 새 이메일로만 발송됩니다.
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      
      setIsEmailSent(true);
      setIsChangingEmail(false);
      alert(`${newEmail} 주소로 인증 메일을 보냈습니다. 메일함에서 'Confirm' 버튼을 눌러야 최종적으로 변경됩니다.`);
    } catch (err: any) {
      setEmailError(err.message || "이메일 변경에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0064FF]" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-2xl font-bold text-[#191F28] mb-8">계정 설정</h1>

        {/* 계정 정보 섹션 */}
        <section className="bg-white rounded-[24px] border border-[#F2F4F6] p-8 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#191F28] mb-6">계정 정보</h2>
          
          <div className="space-y-8">
            {/* 이메일 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-[#8B95A1] mb-1">이메일</p>
                {isChangingEmail ? (
                  <div className="mt-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        setEmailError("");
                      }}
                      placeholder="새 이메일 주소 입력"
                      className="w-full max-w-sm h-12 px-4 rounded-xl border border-[#E5E8EB] focus:border-[#0064FF] focus:ring-1 focus:ring-[#0064FF] outline-none text-[15px]"
                    />
                    {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={handleEmailUpdate}
                        className="px-4 py-2 bg-[#0064FF] text-white rounded-lg text-sm font-semibold"
                      >
                        변경 확인
                      </button>
                      <button 
                        onClick={() => setIsChangingEmail(false)}
                        className="px-4 py-2 bg-[#F2F4F6] text-[#4E5968] rounded-lg text-sm font-semibold"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-[#333D4B]">{profile?.email}</span>
                    {isEmailSent && (
                      <span className="flex items-center gap-1 text-[#00D4B1] text-xs font-medium bg-[#E6FBF7] px-2 py-0.5 rounded-full animate-pulse">
                        <CheckCircle2 className="w-3 h-3" /> 인증 대기 중 (메일을 확인해주세요)
                      </span>
                    )}
                  </div>
                )}
              </div>
              {!isChangingEmail && (
                <button 
                  onClick={() => setIsChangingEmail(true)}
                  className="px-4 py-2 border border-[#E5E8EB] rounded-lg text-sm font-semibold text-[#4E5968] hover:bg-gray-50"
                >
                  변경하기
                </button>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="flex items-center justify-between pt-6 border-t border-[#F9FAFB]">
              <div>
                <p className="text-sm font-medium text-[#8B95A1] mb-1">비밀번호</p>
                <span className="text-[16px] font-semibold text-[#333D4B]">••••••••</span>
                {isPasswordSent && (
                  <p className="text-[#00D4B1] text-xs mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 재설정 메일이 발송되었습니다.
                  </p>
                )}
              </div>
              <button 
                onClick={handlePasswordReset}
                className="px-4 py-2 border border-[#E5E8EB] rounded-lg text-sm font-semibold text-[#4E5968] hover:bg-gray-50"
              >
                변경하기
              </button>
            </div>
          </div>
        </section>

        {/* 기본 정보 섹션 */}
        <section className="bg-white rounded-[24px] border border-[#F2F4F6] p-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#191F28] mb-6">기본 정보</h2>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-[#4E5968] mb-2">이름</p>
              <div className="h-14 w-full rounded-2xl bg-[#F2F4F6] px-5 flex items-center text-[15px] font-medium text-[#8B95A1] cursor-not-allowed">
                {profile?.full_name || "이름 정보 없음"}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[#4E5968] mb-2">연락처</p>
              <div className="h-14 w-full rounded-2xl bg-[#F2F4F6] px-5 flex items-center text-[15px] font-medium text-[#8B95A1] cursor-not-allowed">
                {profile?.phone_number || "연락처 정보 없음"}
              </div>
            </div>
            
            <p className="text-[13px] text-[#8B95A1] pt-2">
              ※ 이름과 연락처 정보는 고객센터를 통해서만 변경 가능합니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
