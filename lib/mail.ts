import { Resend } from 'resend';
import QRCode from 'qrcode';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Santa's Workshop <postmaster@fyht4.com>";

type CardOrderDetails = {
  shippingAddress: string;
  referralCode: string;
  childNames: string[];
};

export const sendOrderConfirmation = async (userEmail: string, details: CardOrderDetails) => {
  const { shippingAddress, referralCode, childNames } = details;
  const domain = 'https://spiritofsanta.com';
  const magicUrl = referralCode ? `${domain}/magic?code=${referralCode}` : '';
  const qrDataUrl = magicUrl ? await QRCode.toDataURL(magicUrl, { width: 200, margin: 1 }) : '';

  // To User
  await resend.emails.send({
    from: FROM_EMAIL,
    to: userEmail,
    subject: "✨ Your Magic Cards are on the way!",
    html: `<p>We've received your order for <strong>20x Physical Magic Referral Cards</strong>. Our elves are preparing them now.</p>`
  });

  // To Company
  await resend.emails.send({
    from: FROM_EMAIL,
    to: "admin@thevacorp.com",
    subject: "#sos card order",
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:auto;">
        <h1 style="color:#c0392b;">🎄 New Physical Card Order</h1>
        <table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:24px;">
          <tr><td style="padding:8px 12px;font-weight:bold;color:#555;">Parent Email</td><td style="padding:8px 12px;">${userEmail}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:bold;color:#555;">Children</td><td style="padding:8px 12px;">${childNames.length ? childNames.join(', ') : 'None registered'}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;color:#555;">Family Code</td><td style="padding:8px 12px;color:#c0392b;font-weight:bold;">${referralCode || 'N/A'}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px 12px;font-weight:bold;color:#555;">Ship To</td><td style="padding:8px 12px;"><pre style="margin:0;font-family:sans-serif;white-space:pre-wrap;">${shippingAddress || 'No address on file'}</pre></td></tr>
        </table>
        ${qrDataUrl ? `
        <div style="text-align:center;margin-bottom:24px;">
          <p style="color:#555;font-size:13px;margin-bottom:8px;">QR Code for cards (links to ${magicUrl})</p>
          <img src="${qrDataUrl}" width="180" height="180" style="border-radius:12px;" />
        </div>` : ''}
        <p style="color:#aaa;font-size:11px;">Print this QR on the physical cards. Order total: $10.00</p>
      </div>
    `,
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

type WishlistChild = {
  name: string;
  items: { name: string; pointCost: number }[];
};

export const sendFinalList = async (
  parentEmail: string,
  shippingAddress: string,
  children: WishlistChild[]
) => {
  const childrenHtml = children.map((child) => {
    const itemRows = child.items.length
      ? child.items.map((item) => `<tr><td style="padding:6px 12px;">${item.name}</td><td style="padding:6px 12px;color:#c0392b;">${item.pointCost} pts</td></tr>`).join("")
      : `<tr><td colspan="2" style="padding:6px 12px;color:#888;font-style:italic;">No items on wish list</td></tr>`;
    return `
      <div style="margin-bottom:32px;border:2px solid #c0392b;border-radius:12px;overflow:hidden;">
        <div style="background:#c0392b;color:white;padding:10px 16px;font-size:18px;font-weight:bold;">
          🎁 ${child.name}
        </div>
        <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <thead><tr style="background:#fdf0ef;"><th style="padding:6px 12px;text-align:left;">Present</th><th style="padding:6px 12px;text-align:left;">Value</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </div>`;
  }).join("");

  await resend.emails.send({
    from: FROM_EMAIL,
    to: "admin@thevacorp.com",
    subject: "#finallist",
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:auto;">
        <h1 style="color:#c0392b;">🎄 Christmas Final List</h1>
        <p><strong>Parent email:</strong> ${parentEmail}</p>
        <div style="background:#f8f8f8;border-radius:8px;padding:16px;margin-bottom:24px;">
          <strong>📦 Ship to:</strong><br/>
          <pre style="margin:8px 0 0;font-family:sans-serif;white-space:pre-wrap;">${shippingAddress}</pre>
        </div>
        <h2 style="color:#333;">Children's Wish Lists</h2>
        ${childrenHtml}
      </div>
    `,
  });
};

export const sendDeedCards = async (
  parentEmail: string,
  childName: string,
  codes: string[],
  domain: string
) => {
  const qrImages = await Promise.all(
    codes.map((code) => QRCode.toDataURL(`${domain}/verify/${code}`, { width: 120, margin: 1 }))
  );
  const cardRows = codes.map((code, i) => `
    <div style="border:2px solid #c0392b;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;gap:14px;align-items:center;">
      <img src="${qrImages[i]}" width="90" height="90" style="flex-shrink:0;border-radius:8px;" />
      <div style="flex:1;">
        <div style="font-size:10px;color:#c0392b;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Spirit of Santa · Card ${i + 1}</div>
        <div style="font-size:15px;color:#1a1a1a;font-style:italic;margin-bottom:10px;">${childName} did a good deed for you!</div>
        <div style="font-size:11px;color:#555;margin-bottom:8px;">To reward them with Magic Points, visit:</div>
        <a href="${domain}/verify/${code}" style="display:block;background:#fdf0ef;border-radius:6px;padding:10px 14px;font-size:13px;font-weight:bold;color:#c0392b;text-decoration:none;word-break:break-all;">${domain}/verify/${code}</a>
      </div>
    </div>
  `).join('');

  await resend.emails.send({
    from: FROM_EMAIL,
    to: parentEmail,
    subject: `🎁 ${childName}'s Referral Cards — Print or Share!`,
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:auto;padding:32px;">
        <h1 style="color:#c0392b;font-size:26px;margin-bottom:8px;">✨ Magic Referral Cards</h1>
        <p style="color:#555;margin-bottom:32px;">Here are ${codes.length} referral cards for <strong>${childName}</strong>. Share these links with neighbors — when they verify the deed, ${childName} earns Magic Points!</p>
        ${cardRows}
        <p style="color:#aaa;font-size:11px;margin-top:24px;">Each code can only be used once.</p>
      </div>
    `,
  });
};

export const sendFamilyReferralCards = async (
  parentEmail: string,
  familyName: string,
  referralCode: string,
  domain: string
) => {
  const magicUrl = `${domain}/magic?code=${referralCode}`;
  const qrDataUrl = await QRCode.toDataURL(magicUrl, { width: 120, margin: 1 });
  const cards = Array.from({ length: 8 }, (_, i) => `
    <div style="border:2px solid #c0392b;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;gap:14px;align-items:center;">
      <img src="${qrDataUrl}" width="90" height="90" style="flex-shrink:0;border-radius:8px;" />
      <div style="flex:1;">
        <div style="font-size:10px;color:#c0392b;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Spirit of Santa · Card ${i + 1}</div>
        <div style="font-size:15px;color:#1a1a1a;font-style:italic;margin-bottom:10px;">The ${familyName} family has been spreading holiday magic!</div>
        <div style="font-size:11px;color:#555;margin-bottom:8px;">Send them a Magic Tip or message at:</div>
        <a href="${magicUrl}" style="display:block;background:#fdf0ef;border-radius:6px;padding:10px 14px;font-size:13px;font-weight:bold;color:#c0392b;text-decoration:none;word-break:break-all;">${magicUrl}</a>
      </div>
    </div>
  `).join('');

  await resend.emails.send({
    from: FROM_EMAIL,
    to: parentEmail,
    subject: `🎁 Your Family Referral Cards — ${referralCode}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:auto;padding:32px;">
        <h1 style="color:#c0392b;font-size:26px;margin-bottom:8px;">✨ Family Referral Cards</h1>
        <p style="color:#555;margin-bottom:8px;">Here are 8 referral cards for the <strong>${familyName} family</strong>. Share these with neighbors, friends, or anyone who wants to spread holiday magic!</p>
        <p style="color:#888;font-size:12px;margin-bottom:32px;">Your family code: <strong style="color:#c0392b;">${referralCode}</strong></p>
        ${cards}
      </div>
    `,
  });
};

export const sendMagicTipNotification = async (
  parentEmail: string,
  childName: string,
  amountCents: number,
  message: string
) => {
  const dollars = (amountCents / 100).toFixed(2);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: parentEmail,
    subject: `✨ ${childName} received a Magic Tip!`,
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:auto;padding:32px;">
        <h1 style="color:#c0392b;font-size:24px;margin-bottom:8px;">Someone sent magic! ✨</h1>
        <p style="color:#555;margin-bottom:24px;">A neighbor sent a <strong>$${dollars}</strong> magic tip to <strong>${childName}</strong>'s family. It's been added to your Magic Points wallet.</p>
        ${message ? `<div style="background:#fdf0ef;border-left:4px solid #c0392b;border-radius:8px;padding:16px;margin-bottom:24px;"><p style="color:#1a1a1a;font-style:italic;margin:0;">"${message}"</p></div>` : ""}
        <p style="color:#aaa;font-size:12px;">Spirit of Santa — spreading holiday magic one deed at a time.</p>
      </div>
    `,
  });
};