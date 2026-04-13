import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase 환경 변수가 비어 있습니다. .env.local 파일에서 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해 주세요."
  );
}

export const supabase = createBrowserClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    flowType: "pkce",
  },
});
