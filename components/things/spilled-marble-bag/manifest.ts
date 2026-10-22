import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Spilled marble bag',
  summary:
    'A drawstring pouch on its side pouring glass marbles across the floor: cat\'s-eyes, swirls and one big shooter, sometimes with a chalk ring game half played. Schoolyards, pocket treasure, winning and swapping, small fortunes, scattered thoughts, losing your marbles.',
  scales: ['tabletop', 'room', 'macro', 'street'],
});
