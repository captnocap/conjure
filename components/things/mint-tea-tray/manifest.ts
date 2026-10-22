import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mint tea tray',
  summary:
    'A low engraved brass tray table with a long-spouted silver teapot, small painted glasses, a sprig of mint and rising steam. Moroccan welcome, negotiation, a pause in the heat, sweetness, someone who just got up and left.',
  scales: ['street', 'room', 'tabletop'],
});
