"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const initializeRecovery = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const { data } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      // recovery 타입이거나 이미 세션이 있는 경우 (비밀번호 찾기 링크 클릭 시 세션이 생성됨)
      if (hashParams.get("type") === "recovery" || data.session) {
        setReady(true);
        setError(null);
        return;
      }

      // 유효하지 않은 접근 시 홈으로 리다이렉트
      alert("유효하지 않거나 만료된 접근입니다.");
      window.location.href = "/";
    };

    void initializeRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setError(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ready) {
      setError("유효하지 않거나 만료된 비밀번호 재설정 링크입니다.");
      return;
    }

    if (!password) {
      setError("새로운 비밀번호를 입력해주세요.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      alert("비밀번호 변경이 완료되었습니다.");
      await supabase.auth.signOut();
      window.location.href = "/?auth=login";
    } catch (err) {
      const message = err instanceof Error ? err.message : "비밀번호 변경 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-6 pt-28 pb-20">
      <div className="mx-auto w-full max-w-[520px] rounded-[32px] border border-[#f2f4f6] bg-white p-8 shadow-sm md:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-bold tracking-tight text-[#191f28]">비밀번호 재설정</h1>
          <p className="mt-2 text-[15px] text-[#6b7684]">
            새로운 비밀번호를 입력하고 변경을 완료해주세요.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="새로운 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#191f28] outline-none transition-all focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5 placeholder:text-[#adb5bd]"
          />
          <input
            type="password"
            placeholder="새로운 비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#191f28] outline-none transition-all focus:border-[#0064FF] focus:ring-4 focus:ring-[#0064FF]/5 placeholder:text-[#adb5bd]"
          />

          {error && <p className="text-center text-[13px] font-medium text-[#f04452]">{error}</p>}

          <button
            type="submit"
            disabled={loading || !ready}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#0064FF] text-[16px] font-bold text-white transition-all hover:bg-[#0052d4] active:scale-[0.98] disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "비밀번호 변경"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-[13px] font-medium text-[#8b95a1] hover:text-[#4e5968] hover:underline">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
