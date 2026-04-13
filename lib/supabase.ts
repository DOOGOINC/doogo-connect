import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase 환경 변수가 누락되었습니다. .env.local 파일을 확인해주세요.\n' +
    'NEXT_PUBLIC_SUPABASE_URL\n' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createBrowserClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);
