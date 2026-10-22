import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hover-car',
  summary:
    'A custom lowrider that floats instead of rolling: candy lacquer and metal flake, flames or murals down the flanks, chrome, fins, whitewall lift pods and turbines. Cruising, showing off, retro-futures, Saturday night.',
  // Wraps a builder from the Three.js ateliers repository; offered only when it is linked in.
  requires: ['ateliers'],
  scales: ['street'],
});
