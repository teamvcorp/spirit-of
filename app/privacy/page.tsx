import Link from "next/link";

export const metadata = { title: "Privacy Policy · Spirit of Santa" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <nav className="flex justify-between items-center px-6 sm:px-8 py-6 max-w-4xl mx-auto">
        <Link href="/" className="text-xl font-serif italic font-bold tracking-tight">Spirit of Santa</Link>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition">&larr; Home</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-serif italic tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated {new Date().getFullYear()}</p>

        <div className="space-y-8 text-slate-600 leading-relaxed text-sm">
          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">Who we are</h2>
            <p>Spirit of Santa is a program of Von Der Becke Academy Corp, a registered 501(c)(3) nonprofit (EIN 46-1005883). This policy explains what we collect and how we protect it — especially for the children in our care.</p>
          </section>

          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">Information about children (COPPA)</h2>
            <p>Children&apos;s accounts are created and managed by a parent or guardian. We collect only what is needed to run the program: a child&apos;s first name, their behavior votes and Magic Points, and the toys they add to a wishlist. We do not ask children for contact information, and we never show prices, payments, or advertising on a child&apos;s dashboard. A parent may review or delete their child&apos;s data at any time from the parent dashboard.</p>
          </section>

          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">Information from parents</h2>
            <p>For parent accounts we collect your email, a securely hashed password, your shipping address (only when you finalize a gift), and a payment record. Card details are handled entirely by Stripe — we never see or store your full card number.</p>
          </section>

          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">How we use information</h2>
            <p>To operate the wishlist and behavior features, to process and ship gifts you choose to fund, and to communicate with you about your account. We do not sell personal information, and we do not share it except with the service providers needed to run the program (such as Stripe for payments and our shipping partners).</p>
          </section>

          <section>
            <h2 className="text-lg font-serif italic text-slate-900 mb-2">Your choices</h2>
            <p>You can update or delete your family&apos;s data from the parent dashboard, or by contacting us at the address on our <Link href="/contact" className="text-crimson-600 hover:underline">Contact</Link> page. We retain data only as long as needed to provide the service and meet our nonprofit recordkeeping obligations.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <Link href="/" className="text-sm font-semibold text-crimson-600 hover:text-crimson-700 transition">&larr; Back to home</Link>
        </div>
      </main>
    </div>
  );
}
