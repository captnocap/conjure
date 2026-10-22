import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ramen counter stool',
  summary:
    'A chrome swivel stool bolted to the floor, with a cracked vinyl pad, a foot ring and sometimes a coat or courier bag left on it. Late-night counters, eating alone, a seat still warm, someone who just walked out into the rain.',
  scales: ['room', 'street', 'tabletop'],
});
