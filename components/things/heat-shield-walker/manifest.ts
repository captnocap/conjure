import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Heat-shield walker',
  summary:
    'A six-legged survey machine carrying a mirrored parasol against a brutal sun, radiator fins glowing, picking its way over hot ground. Endurance, careful steps, a lone explorer far from help, robots that keep going, the edge of the survivable.',
  scales: ['landscape', 'planetary', 'street', 'tabletop'],
});
