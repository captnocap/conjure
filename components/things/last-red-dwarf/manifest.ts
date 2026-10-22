import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Last red dwarf',
  summary:
    'A small, dim, deep-red star with a few dark spots and a faint flare now and then, sometimes with cold worlds huddled close. The last light still on: pilot lights, the last porch light on the street, endurance, the tortoise outliving every hare, a warm thing at the end of time.',
  scales: ['cosmic', 'planetary'],
});
