"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    const run = async () => {
      const token = new URLSearchParams(window.location.search).get("token") ?? "";
      if (!token) {
        setStatus("fail");
        return;
      }
      try {
        const r = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const d = await r.json();
        setStatus(d.ok ? "ok" : "fail");
      } catch {
        setStatus("fail");
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white p-10 sm:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 size={36} className="text-crimson-400 animate-spin mx-auto mb-5" />
            <h1 className="text-2xl font-serif italic text-slate-900">Confirming your email…</h1>
          </>
        )}
        {status === "ok" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 rounded-2xl mb-5">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-serif italic text-slate-900 mb-2">Email confirmed! ✨</h1>
            <p className="text-slate-500 text-sm mb-8">Thanks — your account is all set. You can sign in now.</p>
            <Link href="/login" className="inline-block bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-crimson-600 transition">
              Go to Login
            </Link>
          </>
        )}
        {status === "fail" && (
          <>
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mb-5">
              <XCircle size={28} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-serif italic text-slate-900 mb-2">Link expired or invalid</h1>
            <p className="text-slate-500 text-sm mb-8">This confirmation link has already been used or isn&apos;t valid. You can still sign in — your account works either way.</p>
            <Link href="/login" className="inline-block bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-crimson-600 transition">
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
