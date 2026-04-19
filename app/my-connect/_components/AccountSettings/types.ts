export interface Profile {
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  referral_code: string | null;
  referred_by_code: string | null;
  referred_by_profile_id?: string | null;
  business_company_name?: string | null;
  business_registration_number?: string | null;
  business_owner_name?: string | null;
  business_type?: string | null;
  business_item?: string | null;
  business_address?: string | null;
  business_attachment_url?: string | null;
  business_attachment_name?: string | null;
  business_attachment_uploaded_at?: string | null;
}

export type PointSummaryPayload = {
  referralCount?: number;
};
