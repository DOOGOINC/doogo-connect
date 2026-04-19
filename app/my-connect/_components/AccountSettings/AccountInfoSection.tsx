import { CheckCircle2 } from "lucide-react";
import type { Profile } from "./types";

interface AccountInfoSectionProps {
  emailError: string;
  handleEmailUpdate: () => void;
  handlePasswordReset: () => void;
  isChangingEmail: boolean;
  isEmailSent: boolean;
  isPasswordSent: boolean;
  isSocialAccount: boolean;
  newEmail: string;
  profile: Profile | null;
  setEmailError: (value: string) => void;
  setIsChangingEmail: (value: boolean) => void;
  setNewEmail: (value: string) => void;
  text: {
    accountInfo: string;
    cancel: string;
    change: string;
    changeConfirm: string;
    email: string;
    emailPending: string;
    noEmail: string;
    password: string;
    passwordMailSent: string;
    socialNotice: string;
  };
}

export function AccountInfoSection({
  emailError,
  handleEmailUpdate,
  handlePasswordReset,
  isChangingEmail,
  isEmailSent,
  isPasswordSent,
  isSocialAccount,
  newEmail,
  profile,
  setEmailError,
  setIsChangingEmail,
  setNewEmail,
  text,
}: AccountInfoSectionProps) {
  return (
    <section className="mb-6 rounded-[14px] border border-[#F2F4F6] bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-lg font-bold text-[#191F28]">{text.accountInfo}</h2>

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="mb-1 text-sm font-medium text-[#8B95A1]">{text.email}</p>
            {isChangingEmail ? (
              <div className="mt-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => {
                    setNewEmail(event.target.value);
                    setEmailError("");
                  }}
                  placeholder="New email address"
                  className="h-12 w-full max-w-sm rounded-xl border border-[#E5E8EB] px-4 text-[15px] outline-none focus:border-[#0064FF] focus:ring-1 focus:ring-[#0064FF]"
                />
                {emailError ? <p className="mt-1 text-xs text-red-500">{emailError}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button onClick={handleEmailUpdate} className="rounded-lg bg-[#0064FF] px-4 py-2 text-sm font-semibold text-white">
                    {text.changeConfirm}
                  </button>
                  <button
                    onClick={() => setIsChangingEmail(false)}
                    className="rounded-lg bg-[#F2F4F6] px-4 py-2 text-sm font-semibold text-[#4E5968]"
                  >
                    {text.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold text-[#333D4B]">{profile?.email || text.noEmail}</span>
                {isEmailSent ? (
                  <span className="flex animate-pulse items-center gap-1 rounded-full bg-[#E6FBF7] px-2 py-0.5 text-xs font-medium text-[#00D4B1]">
                    <CheckCircle2 className="h-3 w-3" /> {text.emailPending}
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
              {text.change}
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-[#F9FAFB] pt-6">
          <div>
            <p className="mb-1 text-sm font-medium text-[#8B95A1]">{text.password}</p>
            <span className="text-[16px] font-semibold text-[#333D4B]">••••••••</span>
            {isPasswordSent ? (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[#00D4B1]">
                <CheckCircle2 className="h-3 w-3" /> {text.passwordMailSent}
              </p>
            ) : null}
          </div>
          <button
            onClick={handlePasswordReset}
            disabled={isSocialAccount}
            className="rounded-lg border border-[#E5E8EB] px-4 py-2 text-sm font-semibold text-[#4E5968] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {text.change}
          </button>
        </div>

        {isSocialAccount ? <p className="rounded-2xl bg-[#FFF8E1] px-4 py-3 text-[13px] text-[#8A6D1F]">{text.socialNotice}</p> : null}
      </div>
    </section>
  );
}
