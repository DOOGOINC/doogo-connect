"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedEmail) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        alert("가입하지 않은 이메일입니다!");
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (resetError) {
        throw resetError;
      }

      alert("비밀번호 재설정을 위한 이메일을 발송했습니다. 메일함을 확인해주세요!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "비밀번호 재설정 메일 발송에 실패했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-6 pt-28 pb-20">
      <div className="mx-auto w-full max-w-[520px] rounded-[32px] border border-[#f2f4f6] bg-white p-8 shadow-sm md:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-bold tracking-tight text-[#191f28]">비밀번호 찾기</h1>
          <p className="mt-2 text-[15px] text-[#6b7684]">
            가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#191f28] outline-none transition-all focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5 placeholder:text-[#adb5bd]"
          />

          {error && <p className="text-center text-[13px] font-medium text-[#f04452]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#0064FF] text-[16px] font-bold text-white transition-all hover:bg-[#0052d4] active:scale-[0.98] disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "이메일 발송"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-[13px] font-medium text-[#8b95a1] hover:text-[#4e5968] hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
