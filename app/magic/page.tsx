"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, Gift, X, ChevronRight } from "lucide-react";
import StripePaymentModal from "@/components/StripePaymentModal";

type Mode = "choose" | "family" | "general";

const TIP_PRESETS = [500, 1000, 2500, 5000]; // cents
const GENERAL_PRESETS = [500, 1000, 2500, 10000];

function MagicPageInner() {
  const searchParams = useSearchParams();
  const successType = searchParams.get("success"); // "tip" | "general"
  const prefilledCode = searchParams.get("code")?.toUpperCase() ?? "";

  const [mode, setMode] = useState<Mode>(prefilledCode ? "family" : "choose");
  const [code, setCode] = useState(prefilledCode);
  const [looking, setLooking] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ found: boolean; familyName?: string } | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [amountCents, setAmountCents] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState<"tip" | "general" | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Auto-lookup when arriving with a code in URL
  useEffect(() => {
    if (prefilledCode) {
      lookupCode(prefilledCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookupCode = async (c: string) => {
    const trimmed = c.trim().toUpperCase();
    if (!trimmed) return;
    setLooking(true);
    setLookupResult(null);
    setError("");
    try {
      const res = await fetch(`/api/magic/lookup?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setLookupResult(data);
      if (!data.found) setError("That code wasn't found. Double-check and try again.");
    } finally {
      setLooking(false);
    }
  };

  const finalAmountCents = useCustom
    ? Math.round(parseFloat(customAmount || "0") * 100)
    : amountCents;

  const handleSend = async () => {
    setError("");
    if (finalAmountCents < 100) { setError("Minimum is $1.00"); return; }

    setLoading(true);
    try {
      if (mode === "family") {
        if (!lookupResult?.found) { setError("Please enter a valid code first."); return; }
        const res = await fetch("/api/checkout/magic-tip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code.trim().toUpperCase(), amountCents: finalAmountCents, message, senderEmail }),
        });
        const data = await res.json();
        if (data.clientSecret) { setStripeClientSecret(data.clientSecret); return; }
        setError(data.error ?? "Something went wrong.");
      } else {
        const res = await fetch("/api/checkout/magic-general", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents: finalAmountCents, message, senderEmail }),
        });
        const data = await res.json();
        if (data.clientSecret) { setStripeClientSecret(data.clientSecret); return; }
        setError(data.error ?? "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (successType || paymentSuccess) {
    return (
      <main className="min-h-screen bg-royal-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center shadow-2xl"
        >
          <div className="text-5xl mb-6">🎁</div>
          <h1 className="text-3xl font-serif italic text-slate-900 mb-3">Magic sent!</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
          {successType === "tip" || paymentSuccess === "tip"
              ? "Your tip has been received and will be added to the family's Magic Points wallet."
              : "Your donation is in! It will support Spirit of Santa families this holiday season."}
          </p>
          <a
            href="/magic"
            className="inline-block bg-crimson-600 text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-crimson-700 transition"
          >
            Send More Magic
          </a>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-royal-900 flex flex-col items-center justify-center p-6">
      {stripeClientSecret && (
        <StripePaymentModal
          clientSecret={stripeClientSecret}
          title={mode === "family" ? `Send Magic to ${lookupResult?.familyName ?? "Family"}` : "Magic Donation"}
          description={`$${(finalAmountCents / 100).toFixed(2)} ${mode === "family" ? "tip" : "donation"}`}
          submitLabel={`Send $${(finalAmountCents / 100).toFixed(2)}`}
          onSuccess={() => { setStripeClientSecret(null); setPaymentSuccess(mode === "family" ? "tip" : "general"); }}
          onClose={() => setStripeClientSecret(null)}
        />
      )}
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 text-crimson-300 mb-4">
          <Sparkles size={14} />
          <span className="text-[10px] uppercase font-bold tracking-[0.3em]">Spirit of Santa</span>
        </div>
        <h1 className="text-5xl font-serif italic text-white mb-3">Send Some Magic</h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
          Know a child who did something kind? Tip their family. Or donate to all Spirit of Santa
          families this holiday season.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-lg"
      >
        {/* Mode selector */}
        {mode === "choose" && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode("family")}
              className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-crimson-500/50 rounded-[2rem] p-8 text-left transition-all"
            >
              <div className="text-3xl mb-4">✨</div>
              <h2 className="text-white font-serif italic text-xl mb-2 leading-tight">
                A specific family
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                Have a referral code from a card? Send a tip directly to that child&apos;s family.
              </p>
              <div className="flex items-center gap-1 text-crimson-400 text-xs font-bold mt-4 group-hover:gap-2 transition-all">
                Enter code <ChevronRight size={12} />
              </div>
            </button>
            <button
              onClick={() => setMode("general")}
              className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-crimson-500/50 rounded-[2rem] p-8 text-left transition-all"
            >
              <div className="text-3xl mb-4">🌟</div>
              <h2 className="text-white font-serif italic text-xl mb-2 leading-tight">
                All families
              </h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                No code? Donate to support all Spirit of Santa families this holiday season.
              </p>
              <div className="flex items-center gap-1 text-crimson-400 text-xs font-bold mt-4 group-hover:gap-2 transition-all">
                Donate now <ChevronRight size={12} />
              </div>
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {(mode === "family" || mode === "general") && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl"
            >
              {/* Back button */}
              <button
                onClick={() => {
                  setMode("choose");
                  setLookupResult(null);
                  setCode(prefilledCode);
                  setError("");
                }}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-xs font-bold mb-8 transition"
              >
                <X size={12} /> Change
              </button>

              {/* Family-specific: code input */}
              {mode === "family" && (
                <div className="mb-8">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3">
                    Referral Code
                  </p>
                  <div className="flex gap-2">
                    <input
                      ref={codeInputRef}
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setLookupResult(null);
                        setError("");
                      }}
                      placeholder="SANTA-XXXX-XXXX"
                      className="flex-1 px-5 py-3.5 bg-slate-50 rounded-2xl text-sm font-mono tracking-wider outline-none border-2 border-transparent focus:border-crimson-300 transition uppercase"
                      onKeyDown={(e) => e.key === "Enter" && lookupCode(code)}
                    />
                    <button
                      onClick={() => lookupCode(code)}
                      disabled={looking || !code.trim()}
                      className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-crimson-600 transition disabled:opacity-40"
                    >
                      {looking ? "…" : "Find"}
                    </button>
                  </div>
                  {lookupResult?.found && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 mt-3 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5 text-sm font-semibold"
                    >
                      <Heart size={14} className="fill-emerald-500 text-emerald-500" />
                      Sending to {lookupResult.familyName}
                    </motion.div>
                  )}
                </div>
              )}

              {/* General mode header */}
              {mode === "general" && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-4">
                    <Gift size={18} className="text-crimson-500" />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">All Spirit of Santa Families</p>
                      <p className="text-slate-400 text-xs">Your donation supports the whole program</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="mb-6">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3">
                  Amount
                </p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {(mode === "family" ? TIP_PRESETS : GENERAL_PRESETS).map((cents) => (
                    <button
                      key={cents}
                      onClick={() => { setAmountCents(cents); setUseCustom(false); setCustomAmount(""); }}
                      className={`py-3 rounded-2xl text-sm font-bold transition ${
                        !useCustom && amountCents === cents
                          ? "bg-crimson-600 text-white shadow-lg"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      ${cents / 100}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setUseCustom(true); }}
                    placeholder="Custom amount"
                    className={`w-full pl-8 pr-4 py-3.5 rounded-2xl text-sm outline-none border-2 transition ${
                      useCustom ? "border-crimson-300 bg-white" : "border-transparent bg-slate-50"
                    }`}
                  />
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3">
                  Leave a message <span className="normal-case font-normal text-slate-300">(optional)</span>
                </p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your kind words…"
                  rows={3}
                  maxLength={500}
                  className="w-full px-5 py-4 bg-slate-50 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-crimson-200 transition resize-none"
                />
              </div>

              {/* Sender email (optional) */}
              <div className="mb-8">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-3">
                  Your email <span className="normal-case font-normal text-slate-300">(optional — for receipt)</span>
                </p>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-5 py-3.5 bg-slate-50 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-crimson-200 transition"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4 px-1">{error}</p>
              )}

              <button
                onClick={handleSend}
                disabled={
                  loading ||
                  finalAmountCents < 100 ||
                  (mode === "family" && !lookupResult?.found)
                }
                className="w-full flex items-center justify-center gap-2 bg-crimson-600 text-white py-5 rounded-full font-bold text-sm hover:bg-crimson-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-crimson-100"
              >
                <Sparkles size={16} />
                {loading
                  ? "Redirecting to payment…"
                  : `Send $${(finalAmountCents / 100).toFixed(2)} of Magic`}
              </button>

              <p className="text-center text-[10px] text-slate-300 mt-4">
                Secured by Stripe · Spirit of Santa
              </p>
              <p className="text-center text-[9px] text-slate-300 mt-2">
                A project of Von Der Becke Academy Corp &middot; 501(c)(3) &middot; EIN 46-1005883
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

export default function MagicPage() {
  return (
    <Suspense>
      <MagicPageInner />
    </Suspense>
  );
}
