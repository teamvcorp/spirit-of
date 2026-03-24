// app/register/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/app/actions";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "" });
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await registerUser(form.email, form.password);
      router.push("/admin");
    } catch (err: unknown) {
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 max-w-md w-full">
        <h1 className="text-3xl font-serif italic mb-8 text-center">Join the Spirit</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" placeholder="Parent Email" 
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-1 ring-crimson-400"
            onChange={(e) => setForm({...form, email: e.target.value})}
          />
          <input 
            type="password" placeholder="Create Password" 
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-1 ring-crimson-400"
            onChange={(e) => setForm({...form, password: e.target.value})}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button className="w-full bg-slate-900 text-white py-4 rounded-full font-bold hover:bg-crimson-600 transition-colors mt-4">
            Create Parent Account
          </button>
        </form>
      </div>
    </div>
  );
}