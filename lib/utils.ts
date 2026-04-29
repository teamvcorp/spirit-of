export type WishlistItem = {
  toyId: string;
  addedAt: Date | string;
  lockedIn: boolean;
  lockedAt?: Date | string;
  lockReason?: 'manual' | '30day';
};

/** Normalizes a raw wishlist entry — handles both legacy string IDs and the new object format. */
export function normalizeWishlistItem(raw: string | WishlistItem): WishlistItem {
  if (typeof raw === 'string') {
    return { toyId: raw, addedAt: new Date(0), lockedIn: false };
  }
  return raw;
}

export function generateMagicCode() {
  // Generates a code like SANTA-A1B2-C3D4
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SANTA-${segment()}-${segment()}`;
}