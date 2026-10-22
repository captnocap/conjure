import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Roadside memorial cairn',
  summary:
    'A heap of stones and hubcaps with a hand-painted plank, flowers fresh or long wilted, a candle stub and a pair of small shoes. Grief, remembrance, someone who stopped walking to mark a loss, the tenderness people keep after everything else is gone.',
  scales: ['street', 'landscape', 'tabletop'],
});
