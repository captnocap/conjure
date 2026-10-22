import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Erlenmeyer flask',
  summary:
    'A conical glass laboratory flask of coloured liquid, stoppered and calm or bubbling, smoking, foaming over its neck or knocked on its side, with a hand-written label. Discovery, potions, mad science, a cartoon chemistry set, something brewing that nobody is watching.',
  scales: ['tabletop', 'macro', 'room'],
});
