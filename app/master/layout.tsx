import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getPortalHomeByRole } from "@/lib/auth/roles";
import { createClient } from "@/utils/supabase/server";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/partner?tab=admin");
  }

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "master") {
    redirect(getPortalHomeByRole(data?.role));
  }

  return (
    <>
      <div className="hidden">
        <Loader2 className="h-8 w-8" />
      </div>
      {children}
    </>
  );
}
