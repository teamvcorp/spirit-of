"use client";
import { useState } from "react";
import { confirmDeed } from "@/app/actions";
import StripePaymentModal from "@/components/StripePaymentModal";
import { Heart, Sparkles } from "lucide-react";

const PRESETS = [500, 1000, 2000]; // cents

export default function DeedVerify({
  code,
  childName,
  alreadyConfirmed,
}: {
  code: string;
  childName: string;
  alreadyConfirmed: boolean;
}) {
  const [note, setNote] = useState("");
  const [preset, setPreset] = useState(1000);
  const [useCustom, setUseCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | "tip" | "free" | "already">(alreadyConfirmed ? "already" : null);
  const [stripeModal, setStripeModal] = useState<{ clientSecret: string } | null>(null);

  const amountCents = useCustom ? Math.round(parseFloat(customAmount || "0") * 100) : preset;

  const handleFree = async () => {
    setBusy(true);
    setError("");
    const res = await confirmDeed(code, note);
    setBusy(false);
    if (res?.error) setError(res.error);
    else setDone("free");
  };

  const handleTip = async () => {
    if (!amountCents || amountCents < 100) { setError("Minimum tip is $1.00."); return; }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/checkout/deed-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, amountCents, note }),
      });
      const d = await r.json();
      if (!d.clientSecret) { setError(d.error ?? "Couldn't start the tip."); setBusy(false); return; }
      setStripeModal({ clientSecret: d.clientSecret });
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">{done === "tip" ? "🎁" : "✨"}</div>
        <h2 className="text-2xl font-serif mb-2">
          {done === "already" ? "Already confirmed" : "Thank you!"}
        </h2>
        <p className="text-slate-600">
          {done === "tip"
            ? `Your gift became ${childName}'s magic points and helps their whole family's Christmas. You're spreading the spirit of Santa! 🎄`
            : done === "free"
            ? `You confirmed ${childName}'s good deed. It counts toward their Naughty-Nice meter — thank you for encouraging kindness!`
            : `This good deed has already been confirmed. Thank you!`}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl">✨</span>
      </div>
      <h2 className="text-2xl font-serif mb-2 text-center">{childName} did a good deed!</h2>
      <p className="text-slate-600 mb-6 text-center text-sm">
        Confirm their kindness to count it toward their Naughty-Nice meter. If you&apos;d like, add a tip — it becomes
        {" "}{childName}&apos;s magic points and helps their family afford Christmas.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full bg-slate-50 border-none rounded-xl p-4 mb-5 text-slate-900 placeholder:text-slate-400 text-sm"
        placeholder="Leave a nice note (optional)…"
        rows={2}
      />

      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">Add a tip (optional)</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setPreset(c); setUseCustom(false); setCustomAmount(""); }}
            className={`py-3 rounded-2xl text-sm font-bold transition ${!useCustom && preset === c ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
          >
            ${c / 100}
          </button>
        ))}
      </div>
      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
        <input
          type="number" min={1} step="0.01" value={customAmount}
          onChange={(e) => { setCustomAmount(e.target.value); setUseCustom(true); }}
          placeholder="Custom amount"
          className={`w-full pl-8 pr-4 py-3 rounded-2xl text-sm outline-none border-2 transition text-slate-900 placeholder:text-slate-400 ${useCustom ? "border-emerald-400 bg-white" : "border-transparent bg-slate-50"}`}
        />
      </div>

      {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

      <button
        onClick={handleTip}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-emerald-700 text-white py-4 rounded-full font-bold hover:bg-emerald-800 transition disabled:opacity-50 mb-3"
      >
        <Heart size={16} /> Confirm &amp; Tip ${(amountCents / 100 || 0).toFixed(2)}
      </button>
      <button
        onClick={handleFree}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-3 rounded-full font-bold hover:bg-slate-200 transition disabled:opacity-50 text-sm"
      >
        <Sparkles size={15} /> {busy ? "Working…" : "Just confirm (no tip)"}
      </button>

      {stripeModal && (
        <StripePaymentModal
          clientSecret={stripeModal.clientSecret}
          title="Leave a tip"
          description={`Tipping $${(amountCents / 100).toFixed(2)} for ${childName}'s good deed.`}
          submitLabel={`Pay $${(amountCents / 100).toFixed(2)}`}
          onSuccess={() => { setStripeModal(null); setDone("tip"); }}
          onClose={() => setStripeModal(null)}
        />
      )}
    </>
  );
}
