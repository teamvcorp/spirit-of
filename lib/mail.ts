import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Santa's Workshop <postmaster@fyht4.com>";
const ADMIN_EMAIL = process.env.COMPANY_EMAIL!;

export const sendOrderConfirmation = async (userEmail: string, orderDetails: string) => {
  // To User
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "✨ Your Magic Cards are on the way!",
    html: `<p>We've received your order for: <strong>${orderDetails}</strong>. Our elves are preparing them now.</p>`
  });

  // To Company
  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: "🚨 NEW ORDER: Physical Cards",
    html: `<p>New order from ${userEmail}: ${orderDetails}</p>`
  });
};

export const sendDeedVerifiedEmail = async (parentEmail: string, childName: string, note: string) => {
  await resend.emails.send({
    from: FROM_EMAIL,
    to: parentEmail,
    subject: `🌟 Good News for ${childName}!`,
    html: `<p>A neighbor just verified a good deed! Note: "${note}"</p>`
  });
};