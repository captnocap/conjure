import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wooden rocking horse',
  summary:
    'A carved and painted rocking horse on bow rockers with a horsehair mane and tail, a cracked leather saddle and glass eyes, one perhaps missing, still gently rocking. Nurseries and attics, outgrown childhood, heirlooms, a toy that moves when nobody touched it.',
  scales: ['room', 'tabletop', 'street'],
});
