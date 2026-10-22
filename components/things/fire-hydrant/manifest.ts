import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fire hydrant',
  summary: 'A cast-metal street fire hydrant with chained caps, fresh water or a coiled hose, hot pavements, city summers and emergency infrastructure.',
  scales: ['street', 'room', 'tabletop'],
});
