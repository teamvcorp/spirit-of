"use client";

import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe-client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// ─── Inner form ────────────────────────────────────────────────────────────────

function CheckoutForm({
  label,
  onSuccess,
  onClose,
}: {
  label: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Needed by Stripe but we handle success ourselves — stays on this page
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed.");
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement className="mb-6" />
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-4 rounded-full border border-slate-200 text-slate-600 font-bold hover:border-slate-400 transition text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !stripe}
          className="flex-1 py-4 rounded-full bg-slate-900 text-white font-bold hover:bg-crimson-600 transition disabled:opacity-50 text-sm"
        >
          {submitting ? "Processing…" : label}
        </button>
      </div>
    </form>
  );
}

// ─── Public modal ──────────────────────────────────────────────────────────────

export interface StripePaymentModalProps {
  clientSecret: string;
  title: string;
  description?: string;
  submitLabel: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function StripePaymentModal({
  clientSecret,
  title,
  description,
  submitLabel,
  onSuccess,
  onClose,
}: StripePaymentModalProps) {
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.93, opacity: 0 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl font-serif italic mb-1">{title}</h2>
          {description && (
            <p className="text-slate-400 text-sm mb-6">{description}</p>
          )}
          {!description && <div className="mb-6" />}

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#c0392b",
                  borderRadius: "12px",
                  fontFamily: "inherit",
                },
              },
            }}
          >
            <CheckoutForm
              label={submitLabel}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
