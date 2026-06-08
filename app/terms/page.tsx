import Link from "next/link";

export const metadata = { title: "Terms of Service · Spirit of Santa" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <nav className="flex justify-between items-center px-6 sm:px-8 py-6 max-w-4xl mx-auto">
        <Link href="/" className="text-xl font-serif italic font-bold tracking-tight">Spirit of Santa</Link>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition">&larr; Home</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-serif italic tracking-tight mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated {new Date().getFullYear()}</p>

        <div className="space-y-8 text-slate-600 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">The program</h2>
            <p>Spirit of Santa is operated by Von Der Becke Academy Corp, a 501(c)(3) nonprofit. The program lets parents track their children&apos;s good behavior, lets children build a wishlist by earning Magic Points, and lets parents fund the purchase of chosen gifts.</p>
          </section>

          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">Accounts</h2>
            <p>You must be 18 or older to create a parent account, and you are responsible for activity under your account and for any child profiles you create. Keep your password and parent PIN confidential.</p>
          </section>

          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">Toy requests &amp; the wishlist</h2>
            <p>Children and parents may request toys for review. Requested items are checked and priced by our team before they appear in the shop; we may decline any request at our discretion. Adding a toy to a wishlist is not a purchase. Magic Points have no cash value and cannot be transferred or redeemed for money.</p>
          </section>

          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">Payments &amp; gifts</h2>
            <p>Funds you add to your family wallet are processed by Stripe. When you finalize a wishlist, you authorize us to purchase and ship the selected gifts. Because gifts are purchased on your behalf, contact us promptly if something is wrong with an order. Contributions support our educational mission and may not be tax-deductible as charitable gifts where goods are received in return — consult your tax advisor.</p>
          </section>

          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">Changes</h2>
            <p>We may update these terms as the program grows. Continued use after an update means you accept the revised terms. Questions? See our <Link href="/contact" className="text-crimson-600 hover:underline">Contact</Link> page.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <Link href="/" className="text-sm font-semibold text-crimson-600 hover:text-crimson-700 transition">&larr; Back to home</Link>
        </div>
      </main>
    </div>
  );
}
