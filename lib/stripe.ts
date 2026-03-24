import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function createFinalChristmasInvoice(parentId: string, balance: number) {
  // 1. Create a Stripe Invoice Item
  await stripe.invoiceItems.create({
    customer: parentId,
    amount: balance * 100, // Converts points back to cents
    currency: 'usd',
    description: 'Santa Wishlist Final Balance',
  });

  // 2. Create the Invoice
  const invoice = await stripe.invoices.create({
    customer: parentId,
    auto_advance: true, // Automatically attempts payment
  });

  return invoice;
}