"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Gift } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-crimson-100">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-serif italic font-bold tracking-tight">Spirit of Santa</div>
        <div className="flex gap-8 items-center text-sm font-medium">
          <Link href="/login" className="text-slate-500 hover:text-slate-900 transition">Parent Login</Link>
          <Link href="/register" className="bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-crimson-600 transition shadow-lg shadow-slate-200">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-32 max-w-5xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-[10px] font-bold tracking-[0.3em] uppercase bg-crimson-50 text-crimson-700 rounded-full border border-crimson-100">
            A New Tradition for Modern Families
          </span>
          <h1 className="text-6xl md:text-7xl font-serif italic mb-8 tracking-tight">
            Nurturing kindness through <br />
            <span className="text-crimson-600">a touch of magic.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            Track behavior with the Naughty-Nice meter, earn Magic Points through good deeds, and build a wishlist that rewards character.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-slate-900 text-white px-10 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform">
              Start Your Journey
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-16">
          <FeatureCard 
            icon={<ShieldCheck className="text-crimson-500" />}
            title="Parental Voting"
            desc="A daily vote keeps the Naughty-Nice meter moving. Earn enough Magic Points and Christmas wishes come true."
          />
          <FeatureCard 
            icon={<Sparkles className="text-royal-600" />}
            title="Good Deed Cards"
            desc="Physical cards with unique codes for neighbors to scan when your child helps the community."
          />
          <FeatureCard 
            icon={<Gift className="text-crimson-500" />}
            title="Santa's Workshop"
            desc="The elves curate a special shop of gifts. Kids browse and add their favourites to a wishlist using the Magic Points they've earned."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-400 text-xs">
        <p className="tracking-widest uppercase">&copy; {new Date().getFullYear()} Spirit of Santa &bull; Built on fyht4.com</p>
        <p className="mt-2 text-slate-300 tracking-wide normal-case">A project of Von Der Becke Academy Corp &middot; 501(c)(3) Educational Facility &middot; EIN 46-1005883</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">{icon}</div>
      <h3 className="text-xl font-serif italic mb-3">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}