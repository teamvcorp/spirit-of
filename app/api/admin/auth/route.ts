import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hashAdminPw, isAdminAuthenticated } from "@/lib/admin-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function GET() {
  const ok = await isAdminAuthenticated();
  return NextResponse.json({ ok });
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* sendBeacon may send empty body */ }

  // sendBeacon logout — called on tab/window close
  if (body.logout === true) {
    const store = await cookies();
    store.delete(ADMIN_COOKIE);
    return NextResponse.json({ ok: true });
  }

  // Throttle password guessing per IP.
  const limit = await rateLimit(`admin-login:${clientIp(req)}`, 10, 15 * 60);
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const { password } = body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD || typeof password !== "string" || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, hashAdminPw(ADMIN_PASSWORD), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
