// app/register/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/app/actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "" });
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState<{ question: string; token: string }>({ question: "", token: "" });
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const loadCaptcha = useCallback(async () => {
    try {
      const r = await fetch("/api/captcha");
      const d = await r.json();
      setCaptcha({ question: d.question, token: d.token });
      setCaptchaAnswer("");
    } catch {
      setCaptcha({ question: "", token: "" });
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await registerUser(form.email, form.password, captcha.token, captchaAnswer);
      if (res?.error) {
        setError(res.error);
        await loadCaptcha(); // tokens are single-use per attempt
        return;
      }
      router.push("/login?registered=1");
    } catch (err: unknown) {
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Registration failed.");
      await loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 max-w-md w-full">
        <h1 className="text-3xl font-serif italic mb-8 text-center">Join the Spirit</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" placeholder="Parent Email" required
            value={form.email}
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-1 ring-crimson-400 text-slate-900 placeholder:text-slate-400"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password" placeholder="Create Password (6+ characters)" required
            value={form.password}
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-1 ring-crimson-400 text-slate-900 placeholder:text-slate-400"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {/* Simple human check */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4">
            <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">
              {captcha.question || "Loading…"}
            </label>
            <input
              type="text" inputMode="numeric" placeholder="Answer" required
              value={captchaAnswer}
              className="w-full p-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-crimson-400 text-slate-900 placeholder:text-slate-400 text-center"
              onChange={(e) => setCaptchaAnswer(e.target.value.replace(/[^\d-]/g, ""))}
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            disabled={submitting || !captcha.token}
            className="w-full bg-slate-900 text-white py-4 rounded-full font-bold hover:bg-crimson-600 transition-colors mt-4 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create Parent Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
