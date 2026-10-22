import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Blanket fort',
  summary:
    'A den built from dining chairs, a clothes horse and draped blankets held with pegs, torchlight glowing inside and a hand-drawn keep-out sign. Rainy days and sleepovers, secrecy, safety, hiding from grown-ups, a whole world sized for one child.',
  scales: ['room', 'street', 'tabletop'],
});
