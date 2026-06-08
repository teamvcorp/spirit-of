import Link from "next/link";
import { Mail, Heart } from "lucide-react";

export const metadata = { title: "Contact · Spirit of Santa" };

// Update this to your public support address before launch.
const SUPPORT_EMAIL = "admin@thevacorp.com";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <nav className="flex justify-between items-center px-6 sm:px-8 py-6 max-w-4xl mx-auto">
        <Link href="/" className="text-xl font-serif italic font-bold tracking-tight">Spirit of Santa</Link>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition">&larr; Home</Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-crimson-50 rounded-2xl mb-6">
          <Heart size={24} className="text-crimson-500" />
        </div>
        <h1 className="text-4xl font-serif italic tracking-tight mb-4">We&apos;d love to hear from you</h1>
        <p className="text-slate-500 leading-relaxed mb-10">
          Questions about your account, a gift, or the program? Real people read every message — usually a parent volunteer or one of our staff.
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-crimson-600 transition"
        >
          <Mail size={16} /> {SUPPORT_EMAIL}
        </a>

        <div className="mt-14 pt-8 border-t border-slate-200 text-slate-400 text-sm leading-relaxed">
          <p className="font-semibold text-slate-600">Von Der Becke Academy Corp</p>
          <p>A 501(c)(3) Educational Facility · EIN 46-1005883</p>
          <p className="mt-4">
            <Link href="/privacy" className="text-crimson-600 hover:underline">Privacy</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="text-crimson-600 hover:underline">Terms</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
