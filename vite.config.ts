import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon.svg', 'icons/*.png', 'third-party-notices.txt'],
    manifest: {
      id: '/', name: '餐照營養教練', short_name: '餐照教練', description: '可修正的飲食營養記錄示範版',
      lang: 'zh-Hant', start_url: '/', scope: '/', display: 'standalone', background_color: '#f7f6f2', theme_color: '#176b52',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,txt,webmanifest}'], navigateFallback: '/index.html' },
    devOptions: { enabled: false },
  })],
});
