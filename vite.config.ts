import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const DEV_API_TARGET = process.env.API_TARGET || "http://localhost:3001";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /* Offline-first PWA. Caching policy:
       - PRECACHE the public portfolio shell + code (code is secret-free by
         design — Phase 1 keeps all credentials server-side).
       - NEVER cache /api/* (auth responses, IoT state) and never serve the
         SPA shell for /terminal offline — the deck stays network-only.
       - Images are served directly by the browser/CDN — no SW caching to
         avoid stale cross-origin fetch failures. */
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["images/favicon.svg", "images/apple-touch-icon.png", "robots.txt"],
      manifest: {
        id: "/",
        name: "Ronit Baniya Gupta — TheRowKneet",
        short_name: "TheRowKneet",
        description:
          "Computer engineer from Pokhara, Nepal building embedded systems, IoT ecosystems, computer vision and web products.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0b0c0e",
        background_color: "#0b0c0e",
        categories: ["portfolio", "productivity"],
        icons: [
          { src: "/images/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/images/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html}", "**/*.{woff2,svg}"],
        globIgnores: ["**/resume.pdf"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/terminal$/],
        runtimeCaching: [
          {
            urlPattern: /\/resume\.pdf$/,
            handler: "CacheFirst",
            options: {
              cacheName: "resume",
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: DEV_API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
          icons: ["lucide-react"],
        },
      },
    },
  },
});
