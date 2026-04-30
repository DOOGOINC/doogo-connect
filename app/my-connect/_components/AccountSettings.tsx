"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { authFetch } from "@/lib/client/auth-fetch";
import { supabase } from "@/lib/supabase";
import { AccountInfoSection } from "./AccountSettings/AccountInfoSection";
import { BasicInfoSection } from "./AccountSettings/BasicInfoSection";
import { BusinessRegistrationSection } from "./AccountSettings/BusinessRegistrationSection";
import { TEXT } from "./AccountSettings/constants";
import { ReferralSection } from "./AccountSettings/ReferralSection";
import type { Profile } from "./AccountSettings/types";

let syncedProfileUserId: string | null = null;

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
        window.alert(TEXT.userUpdated);
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

      if (syncedProfileUserId !== session.user.id) {
        await authFetch("/api/profile/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: session.user.email || null,
          }),
        });
        syncedProfileUserId = session.user.id;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("email, full_name, phone_number, referral_code, referred_by_code, referred_by_profile_id, business_company_name, business_registration_number, business_owner_name, business_type, business_item, business_address, business_attachment_url, business_attachment_name, business_attachment_uploaded_at")
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

    if (!window.confirm(TEXT.resetConfirm)) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setIsPasswordSent(true);
      window.alert(TEXT.resetSent);
      setTimeout(() => setIsPasswordSent(false), 5000);
    } catch {
      window.alert(TEXT.resetFailed);
    }
  };

  const handleEmailUpdate = async () => {
    if (isSocialAccount) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError(TEXT.invalidEmail);
      return;
    }

    if (newEmail === profile?.email) {
      setEmailError(TEXT.sameEmail);
      return;
    }

    if (!window.confirm(`Email: ${newEmail}\n${TEXT.changeEmailConfirm}`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      setIsEmailSent(true);
      setIsChangingEmail(false);
      window.alert(`${newEmail} ${TEXT.emailChangedMail}`);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : TEXT.emailChangeFailed);
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
      <div className="max-w-[700px]">
        <h1 className="mb-4 text-2xl font-bold text-[#191F28]">{TEXT.settings}</h1>
        <p className="mt-4 mb-6 text-[15px] text-[#6b7280]">사업자 등록증 정보를 입력하세요. 세금계산서 발행에 필요합니다.</p>

        <BusinessRegistrationSection profile={profile} onProfileRefresh={fetchProfile} />

        <AccountInfoSection
          emailError={emailError}
          handleEmailUpdate={handleEmailUpdate}
          handlePasswordReset={handlePasswordReset}
          isChangingEmail={isChangingEmail}
          isEmailSent={isEmailSent}
          isPasswordSent={isPasswordSent}
          isSocialAccount={isSocialAccount}
          newEmail={newEmail}
          profile={profile}
          setEmailError={setEmailError}
          setIsChangingEmail={setIsChangingEmail}
          setNewEmail={setNewEmail}
          text={TEXT}
        />

        <BasicInfoSection profile={profile} text={TEXT} />

        <ReferralSection
          profile={profile}
          text={TEXT}
        />
      </div>
    </div>
  );
}
