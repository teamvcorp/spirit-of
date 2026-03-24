"use client";
import { motion } from "framer-motion";

interface Toy {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface ToyGridProps {
  toys: Toy[];
  points: number;
  isLocked: boolean;
  canShop: boolean;
}

export default function ToyGrid({ toys, points, isLocked, canShop }: ToyGridProps) {
  if (!canShop && !isLocked) {
    return (
      <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
        <p className="text-slate-500 italic font-serif">A positive vote from a parent is needed to unlock the shop today.</p>
      </div>
    );
  }

  if (toys.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
        <p className="text-slate-500 italic font-serif">The toy catalog is being restocked — check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {toys.map((toy) => {
        const canAfford = points >= toy.price;
        
        return (
          <motion.div
            key={toy.id}
            whileHover={{ y: -5 }}
            className={`group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all ${
              isLocked ? "opacity-60 grayscale" : ""
            }`}
          >
            <div className="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
               {/* Replace with <Image /> once you have your Vercel Blob URLs */}
              <div className="w-full h-full flex items-center justify-center text-4xl bg-linear-to-br from-slate-50 to-slate-100">
                🎁
              </div>
            </div>
            
            <h3 className="font-medium text-slate-900 text-lg">{toy.name}</h3>
            <div className="flex justify-between items-center mt-2">
              <span className="text-crimson-600 font-semibold tracking-tight">
                {toy.price} Points
              </span>
              <button
                disabled={!canAfford || isLocked}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                  canAfford && !isLocked
                    ? "bg-slate-900 text-white hover:bg-crimson-600 shadow-md"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isLocked ? "Closed" : canAfford ? "Add to List" : "Need Points"}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}