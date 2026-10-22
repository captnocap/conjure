import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Doll hospital ward',
  summary:
    'A cramped early-1900s doll hospital workroom seen from the front like a shop window: glass cabinets of waiting patients, drawers labelled by part, a long repair counter under a green enamel lamp. Tenderness and unease together, small broken faces waiting to be mended, childhoods kept in drawers, a warm clinic or a shuttered shop where nobody came back.',
  scales: ['room', 'tabletop'],
});
