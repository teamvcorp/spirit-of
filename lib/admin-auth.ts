import { cookies } from "next/headers";
import { createHash } from "crypto";

export const ADMIN_COOKIE = "spirit_admin_token";

export function hashAdminPw(pw: string): string {
  return createHash("sha256")
    .update(pw + (process.env.NEXTAUTH_SECRET ?? "spirit-santa-salt"))
    .digest("hex");
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return token === hashAdminPw(pw);
}
