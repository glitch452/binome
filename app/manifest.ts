import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/**
 * Web App Manifest, served by Next at `/manifest.webmanifest` (the `<link rel="manifest">`
 * is auto-injected). Enables the browser's native Install affordance and standalone launch.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Binome',
    short_name: 'Binome',
    description: 'A countdown timer application. Every second counts.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4f46e5', // indigo-600 — matches the logo background
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
