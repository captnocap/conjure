import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bunsen burner',
  summary:
    'A brass-collared bunsen burner under an iron tripod and gauze, its rubber hose trailing off across the bench, the flame anywhere from a lazy yellow to a roaring blue. School experiments, heat and the smell of gas, goggles on, the small thrill of supervised danger.',
  scales: ['tabletop', 'room', 'macro'],
});
