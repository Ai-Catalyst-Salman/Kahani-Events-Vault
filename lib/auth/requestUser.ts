import { headers } from "next/headers";
import { USER_EMAIL_HEADER, USER_ID_HEADER } from "@/lib/auth/userHeaders";
import { readCachedUser, rememberUser } from "@/lib/auth/verifiedUserCache";
import { isUuid } from "@/lib/security/urls";
import { createClient } from "@/lib/supabase/server";

export async function readVerifiedUser(): Promise<{ id: string; email: string } | null> {
  const headerStore = await headers();
  const headerId = headerStore.get(USER_ID_HEADER);
  if (isUuid(headerId)) {
    return { id: headerId, email: headerStore.get(USER_EMAIL_HEADER) ?? "" };
  }

  const supabase = await createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (token) {
    const cached = readCachedUser(token);
    if (cached) return cached;
  }

  const { data } = token ? await supabase.auth.getClaims(token) : await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  if (!isUuid(subject)) return null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "";
  const user = { id: subject, email };
  if (token) rememberUser(token, user);
  return user;
}
