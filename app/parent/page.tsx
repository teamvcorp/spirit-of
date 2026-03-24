"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users, CreditCard, Plus, CheckCircle2,
  XCircle, Mail, ExternalLink, LayoutDashboard, Lock, X
} from "lucide-react";
import Link from "next/link";
import AddChildModal from "@/components/AddChildModal";
import { submitDailyVote, setParentPin } from "@/app/actions";
import { getMeterStats } from "@/lib/santa-logic";

type DbChild = {
  id: string;
  name: string;
  magicPoints: number;
  votes: { isPositive: boolean; date: string }[];
};

export default function ParentPortal() {
  const [activeTab, setActiveTab] = useState("kids");
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
  const [kids, setKids] = useState<DbChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSetupError, setPinSetupError] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const router = useRouter();

  async function fetchChildren() {
    const res = await fetch("/api/children");
    if (res.status === 401) { router.push("/login"); return; }
    if (res.ok) {
      const data = await res.json();
      setKids(data.children);
      setHasPin(!!data.hasPin);
      if (!data.hasPin) setShowPinSetup(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/children").then(async (res) => {
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setKids(data.children);
      setHasPin(!!data.hasPin);
      if (!data.hasPin) setShowPinSetup(true);
      setLoading(false);
    });
  }, [router]);

  const handleSavePin = async () => {
    if (newPin.length !== 4) { setPinSetupError("PIN must be 4 digits."); return; }
    if (newPin !== confirmPin) { setPinSetupError("PINs do not match."); return; }
    setSavingPin(true);
    await setParentPin(newPin);
    setHasPin(true);
    setShowPinSetup(false);
    setNewPin("");
    setConfirmPin("");
    setSavingPin(false);
  };

  const handleVote = async (childId: string, isPositive: boolean) => {
    await submitDailyVote(childId, isPositive);
    fetchChildren();
  };

  const handleOrderCards = async () => {
    try {
      const res = await fetch("/api/checkout/cards", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Stripe error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex font-sans text-slate-900">

      {/* PIN SETUP MODAL */}
      {showPinSetup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative">
            <button onClick={() => setShowPinSetup(false)} className="absolute top-6 right-8 text-slate-300 hover:text-slate-600 transition">
              <X size={20} />
            </button>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-crimson-50 rounded-2xl mb-4">
                <Lock size={24} className="text-crimson-600" />
              </div>
              <h2 className="text-2xl font-serif italic">Protect the Magic</h2>
              <p className="text-slate-400 text-sm mt-2">
                Set a 4-digit PIN so children can&apos;t navigate back to the Parent Portal from their dashboard.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1 block mb-2">Create PIN</label>
                <input
                  type="password" inputMode="numeric" maxLength={4} value={newPin}
                  onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "")); setPinSetupError(""); }}
                  className="w-full text-center tracking-[1rem] text-2xl py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-crimson-400 outline-none transition"
                  placeholder="••••"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1 block mb-2">Confirm PIN</label>
                <input
                  type="password" inputMode="numeric" maxLength={4} value={confirmPin}
                  onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "")); setPinSetupError(""); }}
                  className="w-full text-center tracking-[1rem] text-2xl py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-crimson-400 outline-none transition"
                  placeholder="••••"
                />
              </div>
              {pinSetupError && <p className="text-red-500 text-xs text-center">{pinSetupError}</p>}
              <button
                onClick={handleSavePin}
                disabled={newPin.length !== 4 || confirmPin.length !== 4 || savingPin}
                className="w-full bg-slate-900 text-white py-4 rounded-full font-bold text-sm hover:bg-crimson-600 transition disabled:opacity-40 mt-2"
              >
                {savingPin ? "Saving…" : "Set PIN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-100 p-10 flex flex-col justify-between fixed h-full">
        <div>
          <div className="text-2xl font-serif italic font-bold mb-12 tracking-tight text-crimson-700">Parent Portal</div>
          <nav className="space-y-2">
            <NavButton active={activeTab === "kids"} onClick={() => setActiveTab("kids")} icon={<Users size={18} />} label="My Children" />
            <NavButton active={activeTab === "billing"} onClick={() => setActiveTab("billing")} icon={<CreditCard size={18} />} label="Billing" />
          </nav>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Verified Domain</p>
            <p className="text-xs font-medium text-slate-600">fyht4.com</p>
          </div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-royal-700 transition font-medium flex items-center gap-2">
            <LayoutDashboard size={13} /> Switch to Dashboards
          </Link>
          <button
            onClick={() => { setNewPin(""); setConfirmPin(""); setPinSetupError(""); setShowPinSetup(true); }}
            className="text-xs text-slate-400 hover:text-crimson-600 transition font-medium flex items-center gap-2"
          >
            <Lock size={13} /> {hasPin ? "Change PIN" : "Set PIN"}
          </button>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-slate-400 hover:text-red-500 transition font-medium">
            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-72 p-16">
        <AddChildModal isOpen={isAddChildModalOpen} onClose={() => setIsAddChildModalOpen(false)} onSuccess={fetchChildren} />

        <AnimatePresence mode="wait">

          {/* CHILDREN TAB */}
          {activeTab === "kids" && (
            <motion.div key="kids" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex justify-between items-end mb-12">
                <div>
                  <h1 className="text-4xl font-serif italic mb-2">Your Children</h1>
                  <p className="text-slate-400 text-sm">Update their daily meter and manage points.</p>
                </div>
                <button
                  onClick={() => setIsAddChildModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-crimson-600 transition shadow-lg shadow-slate-200"
                >
                  <Plus size={16} /> Add Child
                </button>
              </div>

              {loading ? (
                <p className="text-slate-400 text-sm italic">Loading...</p>
              ) : kids.length === 0 ? (
                <div className="text-center py-24 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                  <p className="text-slate-400 font-serif italic text-lg">No children yet.</p>
                  <p className="text-slate-300 text-sm mt-2">Click &ldquo;Add Child&rdquo; to get started.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {kids.map((child) => {
                    const percentage = getMeterStats(child.votes);
                    const todayUTC = new Date().toISOString().slice(0, 10);
                    const todayVote = child.votes.find(v => new Date(v.date).toISOString().slice(0, 10) === todayUTC);
                    const votedToday = !!todayVote;
                    const todayIsNice = todayVote?.isPositive;
                    const yearStatus = percentage >= 50 ? "Nice" : "Naughty";
                    return (
                      <div key={child.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm flex justify-between items-center group hover:border-crimson-200 transition-colors">
                        <div className="flex gap-8 items-center">
                          <div className="w-16 h-16 bg-silver-100 rounded-full flex items-center justify-center text-2xl font-serif italic text-crimson-600 border border-crimson-100">
                            {child.name[0]}
                          </div>
                          <div>
                            <h3 className="text-2xl font-serif italic">{child.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-crimson-600 font-mono text-sm font-bold underline decoration-crimson-200 decoration-2 underline-offset-4">
                                {Math.round(child.magicPoints)} Magic Points
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className={`text-[10px] uppercase font-bold tracking-widest ${yearStatus === "Nice" ? "text-emerald-500" : "text-red-400"}`}>
                                {percentage}% Nice this year
                              </span>
                              {votedToday && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className={`text-[10px] uppercase font-bold tracking-widest ${todayIsNice ? "text-emerald-500" : "text-red-400"}`}>
                                    Today: {todayIsNice ? "Nice ✓" : "Naughty ✗"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleVote(child.id, true)}
                            disabled={votedToday}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition ${
                              votedToday && todayIsNice
                                ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300 cursor-default"
                                : votedToday
                                ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            <CheckCircle2 size={16} /> Nice
                          </button>
                          <button
                            onClick={() => handleVote(child.id, false)}
                            disabled={votedToday}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs transition ${
                              votedToday && !todayIsNice
                                ? "bg-red-100 text-red-700 ring-2 ring-red-300 cursor-default"
                                : votedToday
                                ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            <XCircle size={16} /> Naughty
                          </button>
                          <div className="h-10 w-px bg-slate-100 mx-2" />
                          <Link
                            href={`/dashboard/${child.id}`}
                            target="_blank"
                            title="View child dashboard"
                            className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition"
                          >
                            <LayoutDashboard size={20} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* UPSELL */}
              <div className="mt-16 p-12 bg-royal-900 rounded-[3rem] text-white flex justify-between items-center relative overflow-hidden shadow-2xl shadow-slate-300">
                <div className="z-10 max-w-lg">
                  <div className="flex items-center gap-2 text-crimson-300 mb-4">
                    <Mail size={16} />
                    <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Premium Tradition</span>
                  </div>
                  <h3 className="text-3xl font-serif italic mb-4 leading-tight">Hand-delivered Magic.</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Order a set of 20 high-quality, gold-embossed referral cards. Each card features a unique QR code linked to your family domain. Perfect for kids to hand out when helping neighbors.
                  </p>
                </div>
                <div className="z-10 text-right">
                  <p className="text-3xl font-serif mb-4 text-crimson-300">$10.00</p>
                  <button
                    onClick={handleOrderCards}
                    className="bg-white text-slate-900 px-10 py-5 rounded-full font-bold text-sm hover:bg-crimson-600 hover:text-white transition-all transform hover:scale-105 active:scale-95 shadow-xl"
                  >
                    Order Physical Pack
                  </button>
                </div>
                <div className="absolute -right-8 -bottom-10 opacity-[0.03] text-[180px] rotate-12 italic font-serif pointer-events-none select-none">
                  Santa
                </div>
              </div>
            </motion.div>
          )}

          {/* BILLING TAB */}
          {activeTab === "billing" && (
            <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-4xl font-serif italic mb-12">Billing & Account</h1>
              <div className="max-w-xl bg-white border border-slate-100 rounded-[2.5rem] p-10">
                <div className="flex justify-between items-center mb-8 pb-8 border-b border-slate-50">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Plan</p>
                    <p className="text-xl font-medium">Santa&apos;s Helper SaaS</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">Active</span>
                </div>
                <button className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition">
                  <ExternalLink size={16} /> Manage in Stripe
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

type NavButtonProps = { active: boolean; onClick: () => void; icon: React.ReactNode; label: string };
function NavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-medium text-sm relative ${
        active ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
      {active && <motion.div layoutId="parent-nav-pill" className="absolute right-4 w-1.5 h-1.5 bg-crimson-500 rounded-full" />}
    </button>
  );
}
