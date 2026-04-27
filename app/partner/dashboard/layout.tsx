import { redirect } from "next/navigation";
import { getLoginEntryByRole, getPortalHomeByRole } from "@/lib/auth/roles";
import { getPartnerStatusByUserId } from "@/lib/server/partners";
import { createClient } from "@/utils/supabase/server";

export default async function PartnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/partner?tab=partner");
  }

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "partner") {
    if (!data?.role) {
      redirect(getLoginEntryByRole(null));
    }

    redirect(getPortalHomeByRole(data.role));
  }

  const partnerStatus = await getPartnerStatusByUserId(supabase, user.id);
  if (partnerStatus !== "active") {
    redirect("/partner?tab=partner");
  }

  return children;
}
