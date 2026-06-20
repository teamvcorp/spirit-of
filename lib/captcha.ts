import { createHmac, timingSafeEqual } from "crypto";

/**
 * Stateless math CAPTCHA — no DB, no external service, no cost.
 * The server issues "What is A + B?" plus a signed token that encodes the
 * expected answer as an HMAC (the answer itself is never sent to the client).
 * On submit we recompute the HMAC from the submitted answer and compare.
 * Stops blind bot POST floods that never fetch/solve the challenge.
 */

const SECRET = process.env.NEXTAUTH_SECRET ?? "spirit-of-santa-captcha-salt";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function issueCaptcha(): { question: string; token: string } {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const expiry = Date.now() + TTL_MS;
  const sig = sign(`${a + b}.${expiry}`);
  return { question: `What is ${a} + ${b}?`, token: `${expiry}.${sig}` };
}

export function verifyCaptcha(token: unknown, answer: unknown): boolean {
  if (typeof token !== "string") return false;
  const [expiryStr, sig] = token.split(".");
  const expiry = Number(expiryStr);
  if (!expiry || Date.now() > expiry || !sig) return false;

  const ans = Number(answer);
  if (!Number.isInteger(ans)) return false;

  const expected = sign(`${ans}.${expiry}`);
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
