import Stripe from 'stripe';
import { sendOrderConfirmation } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response(`Webhook Error`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    if (session.metadata?.type === 'PHYSICAL_CARDS') {
      // Trigger the emails!
      await sendOrderConfirmation(session.customer_email!, "20x Physical Magic Cards");
      
      // Update DB if necessary
      console.log("Order confirmed for:", session.customer_email);
    }
  }

  return new Response('Success', { status: 200 });
}