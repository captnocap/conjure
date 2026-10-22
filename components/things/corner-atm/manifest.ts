import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Corner-store ATM',
  summary:
    'A squat freestanding cash machine with a glowing topper sign, a small screen, and a fee notice that is too high. Bodegas, bars and laundromats, cash only, the last twenty before payday, receipts nobody keeps, stickers and tags layered by the whole block.',
  scales: ['room', 'street'],
});
