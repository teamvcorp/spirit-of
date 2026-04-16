import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Spirit of Santa',
    short_name: 'Spirit of Santa',
    description: 'Track behaviour, earn Magic Points, and build a wishlist that rewards character.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#B91C1C',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg',              sizes: 'any',      type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png',          sizes: '192x192',  type: 'image/png',     purpose: 'any' },
      { src: '/icon-512.png',          sizes: '512x512',  type: 'image/png',     purpose: 'any' },
      { src: '/icon-512-maskable.png', sizes: '512x512',  type: 'image/png',     purpose: 'maskable' },
    ],
    related_applications: [
      { platform: 'webapp', url: `${process.env.NEXT_PUBLIC_DOMAIN ?? 'https://spiritofsanta.com'}/manifest.webmanifest` },
    ],
  }
}
