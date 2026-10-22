import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Chimpanzee face',
  summary:
    'A chimpanzee head and shoulders: big ears, bare wrinkled muzzle, deep brow, dark coat. Kinship and being stared back at, zoo glass, field studies, cleverness, fear grins mistaken for smiles, childhood and old age in a face almost ours.',
  scales: ['room', 'tabletop', 'street'],
});
