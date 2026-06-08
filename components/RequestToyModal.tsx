"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ScanLine, Wand2, Loader2, Camera } from "lucide-react";

// Minimal type for the experimental BarcodeDetector API (Chrome/Android).
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

interface Props {
  childId: string;
  onClose: () => void;
  onAdded: () => void; // refresh toys + wishlist after a successful add
}

type Product = { name: string | null; images: string[] };
type LookupResponse = {
  result: {
    ok: boolean;
    status: "enriched" | "verified_no_data" | "invalid";
    product: Product;
    errors: { message: string }[];
  };
  duplicate: { isDuplicate: boolean; matchType: "catalog" | "pending_request" | null };
};

type Step = "input" | "looking" | "preview" | "submitting" | "done";

export default function RequestToyModal({ childId, onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [doneKind, setDoneKind] = useState<"submitted" | "already_in_shop" | "already_requested">("submitted");

  // Camera scanning (progressive enhancement)
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setError("");
    setScanning(true);
    try {
      const detector = new window.BarcodeDetector!({
        formats: ["upc_a", "upc_e", "ean_13", "ean_8"],
      });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            stopCamera();
            const found = codes[0].rawValue.replace(/\D/g, "");
            setCode(found);
            runLookup(found);
            return;
          }
        } catch {
          /* keep scanning */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("Couldn't open the camera — type the number instead.");
      stopCamera();
    }
  };

  const runLookup = async (raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length < 8) {
      setError("That barcode looks too short — it should be 12 or 13 numbers.");
      return;
    }
    setError("");
    setStep("looking");
    try {
      const res = await fetch("/api/upc/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleaned, childId }),
      });
      const data: LookupResponse = await res.json();
      if (!data.result.ok) {
        setError(data.result.errors?.[0]?.message ?? "We couldn't read that barcode. Check the number and try again.");
        setStep("input");
        return;
      }
      setLookup(data);
      setStep("preview");
    } catch {
      setError("Something went wrong reaching the workshop. Try again in a moment.");
      setStep("input");
    }
  };

  const submitRequest = async () => {
    setStep("submitting");
    try {
      const res = await fetch("/api/toy-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.replace(/\D/g, ""), childId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The elves couldn't accept that wish. Try again.");
        setStep("preview");
        return;
      }
      setDoneKind(data.status === "already_in_shop" ? "already_in_shop" : data.status === "already_requested" ? "already_requested" : "submitted");
      setStep("done");
      onAdded();
    } catch {
      setError("Something went wrong sending your wish. Try again.");
      setStep("preview");
    }
  };

  const product = lookup?.result.product;
  const dupKind = lookup?.duplicate.matchType;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => { stopCamera(); onClose(); }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 sm:p-10 max-w-md w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => { stopCamera(); onClose(); }} className="absolute top-6 right-7 text-slate-300 hover:text-slate-600 transition">
          <X size={20} />
        </button>

        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-crimson-50 rounded-2xl mb-4">
            <Wand2 size={24} className="text-crimson-500" />
          </div>
          <h2 className="text-2xl font-serif italic text-slate-900">Ask the Elves for a Toy</h2>
          <p className="text-slate-400 text-sm mt-2">Found a toy you love? Scan the little striped code on its box and send your wish to Santa&apos;s workshop.</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step: input ── */}
          {step === "input" && (
            <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {scanning ? (
                <div className="space-y-3">
                  <div className="relative rounded-3xl overflow-hidden bg-slate-900 aspect-4/3">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-crimson-400 shadow-[0_0_12px_2px] shadow-crimson-400 animate-pulse" />
                  </div>
                  <button onClick={stopCamera} className="w-full py-3 rounded-full text-sm font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                    Stop camera
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <ScanLine size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => { setCode(e.target.value.replace(/[^\d ]/g, "")); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && runLookup(code)}
                      placeholder="Type the barcode numbers"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-crimson-400 rounded-2xl pl-12 pr-4 py-4 text-lg tracking-wide outline-none transition"
                      autoFocus
                    />
                  </div>
                  {canScan && (
                    <button onClick={startCamera} className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                      <Camera size={15} /> Scan with camera
                    </button>
                  )}
                  {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                  <button
                    onClick={() => runLookup(code)}
                    disabled={!code.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-full font-bold text-sm hover:bg-crimson-600 transition disabled:opacity-40"
                  >
                    <Sparkles size={15} /> Find this toy
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* ── Step: looking ── */}
          {step === "looking" && (
            <motion.div key="looking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
              <Loader2 size={32} className="text-crimson-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-serif italic">The elves are looking through Santa&apos;s big book of toys…</p>
            </motion.div>
          )}

          {/* ── Step: preview ── */}
          {step === "preview" && product && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="bg-slate-50 rounded-3xl p-5 flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white overflow-hidden flex items-center justify-center shrink-0 border border-slate-100">
                  {product.images[0] ? (
                    <img src={product.images[0]} alt={product.name ?? "Toy"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🎁</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 leading-snug">{product.name ?? "A mystery toy!"}</p>
                  {!product.name && <p className="text-slate-400 text-xs mt-1">We couldn&apos;t find its name, but the elves can still look into it.</p>}
                </div>
              </div>

              {dupKind === "catalog" && (
                <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-center font-semibold">
                  Good news — this toy is already in the workshop! ✨
                </p>
              )}
              {dupKind === "pending_request" && (
                <p className="text-royal-700 bg-royal-50 border border-royal-100 rounded-2xl px-4 py-3 text-sm text-center font-semibold">
                  An elf is already making this one! We&apos;ll add you to the list. ✨
                </p>
              )}
              {!dupKind && (
                <p className="text-slate-500 text-sm text-center">Is this your toy? Send it to the elves and they&apos;ll check with Santa.</p>
              )}

              {error && <p className="text-red-500 text-xs text-center">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => { setStep("input"); setLookup(null); }} className="flex-1 py-4 rounded-full text-sm font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                  Not it
                </button>
                <button onClick={submitRequest} className="flex-2 flex items-center justify-center gap-2 bg-crimson-600 text-white py-4 rounded-full font-bold text-sm hover:bg-crimson-700 transition">
                  <Sparkles size={15} />
                  {dupKind === "catalog" ? "Add to my wish list" : dupKind === "pending_request" ? "Add me to the list" : "Send to Santa's elves"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step: submitting ── */}
          {step === "submitting" && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
              <Loader2 size={32} className="text-crimson-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-serif italic">Sending your wish up the chimney…</p>
            </motion.div>
          )}

          {/* ── Step: done ── */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
              <div className="text-5xl mb-4">{doneKind === "already_in_shop" ? "🎉" : "✨"}</div>
              <h3 className="text-xl font-serif italic text-slate-900 mb-2">
                {doneKind === "already_in_shop" ? "Added to your wish list!" : doneKind === "already_requested" ? "You're on the list!" : "Your wish is on its way!"}
              </h3>
              <p className="text-slate-500 text-sm px-4">
                {doneKind === "already_in_shop"
                  ? "This toy was already in the workshop, so it's on your wish list now."
                  : doneKind === "already_requested"
                  ? "The elves are already working on this toy. We'll add it to your wish list once it's ready."
                  : "Santa's elves will take a look. If it's a good fit, it'll appear in the shop and on your wish list. 🎄"}
              </p>
              <button onClick={() => { stopCamera(); onClose(); }} className="mt-7 w-full bg-slate-900 text-white py-4 rounded-full font-bold text-sm hover:bg-crimson-600 transition">
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
