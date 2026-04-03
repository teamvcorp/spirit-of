"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import StripePaymentModal from "@/components/StripePaymentModal";

export default function AddChildModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) {
  const [name, setName] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  if (!isOpen) return null;

  if (clientSecret) {
    return (
      <StripePaymentModal
        clientSecret={clientSecret}
        title="Magic Container · $5"
        description={`One-time registration fee for ${name.trim()}'s Spirit of Santa profile.`}
        submitLabel="Pay $5.00"
        onSuccess={() => { setClientSecret(null); onClose(); onSuccess?.(); }}
        onClose={() => setClientSecret(null)}
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout/child-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childName: trimmed, promoCode: promoCode.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        onClose();
        onSuccess?.();
      } else if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError(data.error ?? "Something went wrong.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900">
          <X size={20} />
        </button>

        <h2 className="text-2xl font-serif italic mb-2">New Helper</h2>
        <p className="text-slate-400 text-sm mb-2">Enter your child's name to begin the magic. Each child needs a unique name — if two children share a name, use a nickname (e.g. &ldquo;Emma-Bear&rdquo;).</p>
        <p className="text-xs text-crimson-600 font-semibold mb-8">A one-time $5 Magic Container fee applies per child.</p>

        <form onSubmit={handleSubmit}>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Child's name or nickname"
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 ring-gold-400 mb-4"
          />
          <input
            value={promoCode}
            onChange={(e) => { setPromoCode(e.target.value); setError(""); }}
            placeholder="Promo code (optional)"
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 ring-gold-400 mb-4"
          />
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-slate-900 text-white py-4 rounded-full font-bold hover:bg-crimson-600 transition disabled:opacity-50"
          >
          {loading ? "Loading…" : promoCode.trim() ? "Register Child" : "Continue to Payment · $5"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
