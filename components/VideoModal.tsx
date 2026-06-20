"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function VideoModal({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close video"
            className="absolute -top-10 right-0 text-white/80 hover:text-white transition"
          >
            <X size={28} />
          </button>
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="w-full rounded-2xl shadow-2xl bg-black aspect-video"
          />
          <p className="text-white/90 text-center mt-3 text-sm font-medium">{title}</p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
