import { NextResponse } from "next/server";
import { issueCaptcha } from "@/lib/captcha";

/** Issue a fresh signup CAPTCHA challenge. */
export async function GET() {
  return NextResponse.json(issueCaptcha());
}
