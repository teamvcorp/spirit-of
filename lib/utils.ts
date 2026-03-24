export function generateMagicCode() {
  // Generates a code like SANTA-A1B2-C3D4
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SANTA-${segment()}-${segment()}`;
}