export type AppRole = "member" | "manufacturer" | "master" | "partner";

export function isPrivilegedPortalRole(role: AppRole | null | undefined) {
  return role === "master" || role === "partner";
}

export function getPortalHomeByRole(role: AppRole | null | undefined) {
  if (role === "master") {
    return "/master";
  }

  if (role === "partner") {
    return "/partner/dashboard";
  }

  return "/my-connect";
}

export function getLoginEntryByRole(role: AppRole | null | undefined) {
  if (role === "master") {
    return "/partner?tab=admin";
  }

  if (role === "partner") {
    return "/partner?tab=partner";
  }

  return "/?auth=login";
}
