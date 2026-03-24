"use client";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { addChild } from "@/app/actions";
import { useFormStatus } from "react-dom";

export default function AddChildModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) {
  if (!isOpen) return null;

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
        <p className="text-slate-400 text-sm mb-8">Enter your child's name to begin the magic.</p>

        <form action={async (formData) => {
          await addChild(formData);
          onSuccess?.();
          onClose();
        }}>
          <input 
            required
            name="name"
            placeholder="Child's Name"
            className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 ring-gold-400 mb-4"
          />
          <SubmitButton />
        </form>
      </motion.div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      disabled={pending}
      className="w-full bg-slate-900 text-white py-4 rounded-full font-bold hover:bg-gold-600 transition disabled:opacity-50"
    >
      {pending ? "Adding..." : "Create Child Profile"}
    </button>
  );
}