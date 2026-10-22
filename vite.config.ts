import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Six legacy things wrap builders from the Three.js ateliers repository (captnocap/three). It is
 * optional: link it at ./ateliers (or set CONJURE_ATELIERS_DIR) and they join the catalogue; without
 * it the catalogue leaves them out and everything else works.
 */
const linked = existsSync(resolve('ateliers'));
export const ATELIERS_DIR = resolve(process.env.CONJURE_ATELIERS_DIR ?? 'ateliers');
export const HAS_ATELIERS = linked || existsSync(ATELIERS_DIR);
const allowedHosts = (process.env.CONJURE_ALLOWED_HOSTS ?? '').split(',').map((host) => host.trim()).filter(Boolean);

export default defineConfig({
  define: { 'import.meta.env.CONJURE_ATELIERS': JSON.stringify(String(HAS_ATELIERS)) },
  resolve: {
    // The ateliers are reached through the ./ateliers link and kept at that path, so the browser
    // asks for /ateliers/… and never for /@fs/…: a network intrusion filter (Emerging Threats
    // 2061339) blocks any /@fs request with "raw" in it, which matched faces/draw.ts.
    alias: { '@ateliers': linked ? resolve('ateliers') : ATELIERS_DIR, '@conjure/kit': resolve('kit/index.ts') },
    preserveSymlinks: true,
    // Each atelier has its own node_modules; one copy of each library must serve the whole scene.
    dedupe: ['three', 'p5'],
  },
  // CONJURE_ALLOWED_HOSTS names the hostnames a LAN may use, comma-separated (for example "studio,studio.local").
  server: { host: '127.0.0.1', allowedHosts, fs: { allow: ['.', ...(HAS_ATELIERS ? [ATELIERS_DIR] : [])] } },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    // Without the ateliers, their wrappers still bundle (the catalogue never loads them) but cannot resolve.
    rollupOptions: HAS_ATELIERS ? {} : { external: [/^@ateliers\//] },
  },
});
