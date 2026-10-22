import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bunsen burner bench',
  summary:
    'A section of school lab bench with a gas tap, a bunsen burner under a tripod and gauze, flasks, a test-tube rack and a small sink. First experiments, the smell of gas, a practical lesson going well or badly, something left heating after the bell.',
  scales: ['room', 'tabletop', 'street'],
});
