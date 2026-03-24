"use client";
import { motion } from "framer-motion";

interface MeterProps {
  percentage: number;
}

export default function BehaviorMeter({ percentage }: MeterProps) {
  // Logic to determine color based on behavior
  const isNaughty = percentage < 50;
  
  return (
    <div className="w-full max-w-3xl mx-auto p-8 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-silver-200/40 shadow-xl">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-slate-400 uppercase tracking-[0.2em] text-[10px] font-bold mb-1">
            Naughty / Nice Meter
          </h3>
          <p className="text-3xl font-serif italic text-slate-800">
            {percentage >= 90 ? "Pure Magic" : percentage >= 70 ? "Doing Great" : "Keep Trying"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-5xl font-light tracking-tighter text-slate-900">
            {percentage}<span className="text-xl text-slate-400">%</span>
          </span>
        </div>
      </div>

      <div className="relative h-4 w-full bg-silver-200/50 rounded-full overflow-hidden shadow-inner">
        {/* The "Glow" behind the bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 2, ease: "circOut" }}
          className={`absolute h-full rounded-full blur-sm opacity-50 ${
            isNaughty ? "bg-red-400" : "bg-royal-400"
          }`}
        />
        {/* The Actual Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={`absolute h-full rounded-full shadow-lg ${
            isNaughty 
              ? "bg-linear-to-r from-red-500 to-orange-400" 
              : "bg-linear-to-r from-royal-500 to-royal-800"
          }`}
        />
      </div>
      
      <p className="mt-6 text-center text-slate-400 text-xs tracking-wide">
        {percentage < 100 ? `${100 - percentage}% more kindness to reach perfection` : "You are on the Nice List!"}
      </p>
    </div>
  );
}