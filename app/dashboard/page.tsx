"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Settings } from "lucide-react";

type Child = { id: string; name: string; magicPoints: number };

export default function DashboardIndex() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/children")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setChildren(data.children);
        setLoading(false);
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif italic text-slate-900 tracking-tight">Who&apos;s watching?</h1>
          <p className="text-slate-400 mt-3 text-sm">Select a child to view their Spirit dashboard.</p>
        </div>

        {loading ? (
          <p className="text-center text-slate-400 italic animate-pulse">Loading…</p>
        ) : children.length === 0 ? (
          <div className="text-center">
            <p className="text-slate-400 italic">No children added yet.</p>
            <Link href="/parent" className="mt-4 inline-block text-sm font-bold text-crimson-600 hover:underline">
              Go to Parent Portal →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/dashboard/${child.id}`}
                className="flex bg-white border border-slate-100 rounded-[2rem] p-8 justify-between items-center hover:border-gold-200 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-2xl font-serif italic text-gold-600 border border-gold-100">
                    {child.name[0]}
                  </div>
                  <div>
                    <p className="text-xl font-serif italic">{child.name}</p>
                    <p className="text-xs text-crimson-600 font-bold mt-1">{Math.round(child.magicPoints)} ✨ Magic Points</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-600 transition" />
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/parent" className="text-xs text-slate-300 hover:text-slate-500 inline-flex items-center gap-1.5 transition">
            <Settings size={12} /> Parent Portal
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

