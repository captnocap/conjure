import { defineDirection } from '@conjure/kit';

/**
 * The studio's first house style, now one direction among several. It bends every medium rather
 * than replacing one: a quiet ink plate on cream paper qualifies as readily as a neon wireframe.
 * It brings both of the engine's finishing passes: the otherworld (how the print shows it comes
 * from elsewhere) and the dead-space growth (horror vacui micro-macro detail).
 */
export default defineDirection({
  brief:
    'Direction: Fifth-Worldly, as if from another dimension. The picture should seem to come from elsewhere: surreal, bizarre, or carrying an emotion nobody has named. Lean into the uncanny: impossible scale, liminal places, things that do not belong, documents and prints from elsewhere. Any medium can do this, quiet ink on paper as much as neon; match any explicit art-style request and make it otherworldly within it. No generic blue-to-purple glow. Keep the subject readable.',
  note: 'Direction: Fifth-Worldly, as if from another dimension. Where the idea allows, prefer the uncanny, surreal or impossible answer.',
  finishes: ['otherworld', 'vacui'],
});
