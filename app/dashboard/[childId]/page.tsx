"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BehaviorMeter from "@/components/BehaviorMeter";
import ToyGrid from "@/components/ToyGrid";
import RequestToyModal from "@/components/RequestToyModal";
import { getMeterStats, isShopLocked } from "@/lib/santa-logic";
import { toggleWishlistItem, lockWishlistItem } from "@/app/actions";
import { Lock, X, ShoppingBag, Heart, Pin, Wand2 } from "lucide-react";
import type { WishlistItem } from "@/lib/utils";

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
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [activeTab, setActiveTab] = useState<"shop" | "wishlist">("shop");
  const [isChristmasLocked, setIsChristmasLocked] = useState(false);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // PIN modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Derived lists
  const wishlistIds = wishlistItems.map(w => w.toyId);
  const lockedInIds = wishlistItems.filter(w => w.lockedIn).map(w => w.toyId);

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
          setWishlistItems(data.wishlistItems ?? (data.wishlistIds ?? []).map((id: string) => ({ toyId: id, addedAt: new Date(0).toISOString(), lockedIn: false })));
          setIsChristmasLocked(data.isChristmasLocked ?? false);
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

  const handleToggleWishlist = async (toyId: string, add: boolean) => {
    if (isChristmasLocked) return;
    if (!add && lockedInIds.includes(toyId)) return; // can't remove locked items
    // Optimistic update
    setWishlistItems((prev) =>
      add
        ? [...prev, { toyId, addedAt: new Date().toISOString(), lockedIn: false }]
        : prev.filter((w) => w.toyId !== toyId)
    );
    await toggleWishlistItem(childId, toyId, add);
  };

  const handleLockItem = async (toyId: string) => {
    if (isChristmasLocked) return;
    setLockingId(toyId);
    // Optimistic update
    setWishlistItems((prev) =>
      prev.map((w) => w.toyId === toyId ? { ...w, lockedIn: true, lockedAt: new Date().toISOString(), lockReason: 'manual' as const } : w)
    );
    await lockWishlistItem(childId, toyId);
    setLockingId(null);
  };

  // Re-pull child + catalog after a toy request (a request may auto-add to the wishlist).
  const reloadData = async () => {
    const [childRes, toysRes] = await Promise.all([
      fetch(`/api/children/${childId}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/toys").then((r) => (r.ok ? r.json() : null)),
    ]);
    if (childRes) {
      setChild(childRes.child);
      setWishlistItems(childRes.wishlistItems ?? []);
      setIsChristmasLocked(childRes.isChristmasLocked ?? false);
    }
    if (toysRes?.toys) setToys(toysRes.toys);
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
      {/* Ask-the-Elves request modal */}
      {showRequestModal && (
        <RequestToyModal
          childId={childId}
          onClose={() => setShowRequestModal(false)}
          onAdded={reloadData}
        />
      )}

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
              placeholder={"\u2022\u2022\u2022\u2022"}
              autoComplete="off"
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

      <header className="max-w-6xl mx-auto flex justify-between items-center gap-4 mb-12">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-5xl font-serif italic text-slate-900 tracking-tight">Spirit of Santa</h1>
          <p className="text-slate-400 mt-2 tracking-widest uppercase text-[10px] font-bold truncate">
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
        {/* Tab toggle */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab("shop")}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${
              activeTab === "shop"
                ? "bg-slate-900 text-white shadow-lg"
                : "bg-white text-slate-400 hover:text-slate-700 border border-slate-100"
            }`}
          >
            <ShoppingBag size={15} /> Toy Shop
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all ${
              activeTab === "wishlist"
                ? "bg-crimson-600 text-white shadow-lg"
                : "bg-white text-slate-400 hover:text-slate-700 border border-slate-100"
            }`}
          >
            <Heart size={15} className={activeTab === "wishlist" ? "fill-white" : ""} />
            My Wish List
            {wishlistIds.length > 0 && (
              <span className={`ml-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "wishlist" ? "bg-white/20" : "bg-crimson-100 text-crimson-600"}`}>
                {wishlistIds.length}
              </span>
            )}
          </button>
          {!isChristmasLocked && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-white text-crimson-600 border border-crimson-200 hover:bg-crimson-50 transition-all sm:ml-auto"
            >
              <Wand2 size={15} /> Ask the Elves for a Toy
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "shop" ? (
            <motion.div key="shop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ToyGrid
                toys={toys}
                points={Math.round(child.magicPoints)}
                isLocked={shopLocked}
                canShop={canShop}
                wishlistIds={wishlistIds}
                lockedInIds={lockedInIds}
                onToggleWishlist={handleToggleWishlist}
              />
            </motion.div>
          ) : (
            <motion.div key="wishlist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {isChristmasLocked && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-3xl px-8 py-5 mb-8 text-sm font-semibold">
                  <span className="text-2xl">🎁</span>
                  <span>Your wish list has been sent to Santa! No more changes until after Christmas.</span>
                </div>
              )}
              {wishlistIds.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
                  <p className="text-slate-500 italic font-serif">Your wish list is empty — add toys from the shop!</p>
                </div>
              ) : (
                <>
                  {lockedInIds.length > 0 && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-6 text-xs font-bold">
                      <Pin size={13} className="fill-amber-500 text-amber-500" />
                      {lockedInIds.length} item{lockedInIds.length !== 1 ? 's' : ''} locked in — Santa has them on his priority list!
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {toys.filter((t) => wishlistIds.includes(t.id)).map((toy) => {
                      const item = wishlistItems.find(w => w.toyId === toy.id);
                      const isLocked = item?.lockedIn ?? false;
                      return (
                        <div
                          key={toy.id}
                          className={`bg-white p-6 rounded-4xl shadow-sm border-2 transition-all ${
                            isLocked
                              ? "border-amber-300 ring-2 ring-amber-100 shadow-amber-100"
                              : "border-crimson-200 ring-2 ring-crimson-100"
                          }`}
                        >
                          <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
                            {toy.image ? (
                              <img src={toy.image} alt={toy.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
                            )}
                            {isLocked && (
                              <div className="absolute top-2 right-2 bg-amber-400 text-white rounded-full p-1.5 shadow-md" title="Locked in!">
                                <Pin size={12} className="fill-white" />
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium text-slate-900 text-lg">{toy.name}</h3>
                          {isLocked && (
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">
                              ★ Priority Pick
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-3 gap-2">
                            <span className="text-crimson-600 font-semibold tracking-tight">{toy.price} Points</span>
                            <div className="flex gap-2">
                              {!isChristmasLocked && !isLocked && (
                                <button
                                  onClick={() => handleLockItem(toy.id)}
                                  disabled={lockingId === toy.id}
                                  title="Lock this in as a priority pick"
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-50"
                                >
                                  <Pin size={11} /> Lock In
                                </button>
                              )}
                              {!isChristmasLocked && !isLocked && (
                                <button
                                  onClick={() => handleToggleWishlist(toy.id, false)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition"
                                >
                                  <X size={12} /> Remove
                                </button>
                              )}
                              {isLocked && (
                                <span className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-amber-100 text-amber-700 cursor-default select-none">
                                  <Lock size={11} /> Locked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

