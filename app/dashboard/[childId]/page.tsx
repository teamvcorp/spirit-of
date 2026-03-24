"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BehaviorMeter from "@/components/BehaviorMeter";
import ToyGrid from "@/components/ToyGrid";
import { getMeterStats, isShopLocked } from "@/lib/santa-logic";
import { Lock, X } from "lucide-react";

type Toy = { id: string; name: string; price: number; image: string };

type Child = {
  id: string;
  name: string;
  magicPoints: number;
  votes: { isPositive: boolean; date: string }[];
};

export default function ChildDashboard() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [canShop, setCanShop] = useState(false);
  const [toys, setToys] = useState<Toy[]>([]);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch(`/api/children/${childId}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setChild(data.child);
          setHasPin(data.hasPin);
          setCanShop(data.canShopToday);
        }
        setLoading(false);
      });
    fetch("/api/toys")
      .then((r) => r.json())
      .then((data) => { if (data.toys) setToys(data.toys); });
  }, [childId]);

  const handleAdminLock = () => {
    if (!hasPin) {
      router.push("/parent");
    } else {
      setShowPinModal(true);
      setPin("");
      setPinError(false);
    }
  };

  const handlePinSubmit = async () => {
    setVerifying(true);
    setPinError(false);
    const res = await fetch("/api/pin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, pin }),
    });
    const data = await res.json();
    setVerifying(false);
    if (data.success) {
      router.push("/parent");
    } else {
      setPinError(true);
      setPin("");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-slate-400 font-serif italic text-lg animate-pulse">Loading magic…</p>
      </main>
    );
  }

  if (notFound || !child) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-slate-400 font-serif italic text-lg">Dashboard not found.</p>
      </main>
    );
  }

  const percentage = getMeterStats(child.votes);
  const shopLocked = isShopLocked();

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12">
      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowPinModal(false)}
              className="absolute top-6 right-8 text-slate-300 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 rounded-2xl mb-4">
                <Lock size={24} className="text-slate-600" />
              </div>
              <h2 className="text-2xl font-serif italic">Parent Access</h2>
              <p className="text-slate-400 text-sm mt-2">Enter your 4-digit PIN to continue.</p>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setPinError(false); }}
              className={`w-full text-center tracking-[1rem] text-2xl py-4 bg-slate-50 rounded-2xl border-2 transition outline-none ${
                pinError ? "border-red-300 bg-red-50" : "border-transparent focus:border-crimson-400"
              }`}
              placeholder="\u2022\u2022\u2022\u2022"
              autoFocus
            />
            {pinError && (
              <p className="text-red-500 text-xs text-center mt-3">Incorrect PIN. Try again.</p>
            )}
            <button
              onClick={handlePinSubmit}
              disabled={pin.length !== 4 || verifying}
              className="mt-6 w-full bg-slate-900 text-white py-4 rounded-full font-bold text-sm hover:bg-crimson-600 transition disabled:opacity-40"
            >
              {verifying ? "Checking…" : "Unlock"}
            </button>
          </div>
        </div>
      )}

      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div>
          <h1 className="text-5xl font-serif italic text-slate-900 tracking-tight">Spirit of Santa</h1>
          <p className="text-slate-400 mt-2 tracking-widest uppercase text-[10px] font-bold">
            Helper: {child.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-crimson-600 uppercase tracking-widest">Magic Balance</p>
            <p className="text-3xl font-light text-slate-900">{Math.round(child.magicPoints)} ✨</p>
          </div>
          <button
            onClick={handleAdminLock}
            title="Parent Access"
            className="p-3 text-slate-200 hover:text-slate-500 transition rounded-2xl hover:bg-slate-100"
          >
            <Lock size={18} />
          </button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto mb-20">
        <BehaviorMeter percentage={percentage} />
      </section>

      <section className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-serif mb-8 italic">The Toy Shop</h2>
        <ToyGrid
          toys={toys}
          points={Math.round(child.magicPoints)}
          isLocked={shopLocked}
          canShop={canShop}
        />
      </section>
    </main>
  );
}

