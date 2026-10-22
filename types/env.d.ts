/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" when the Three.js ateliers repository is linked in, set by vite.config.ts. */
  readonly CONJURE_ATELIERS?: string;
}
