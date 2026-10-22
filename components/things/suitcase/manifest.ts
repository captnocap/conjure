import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Suitcase',
  summary: 'A travel suitcase with a tag, handle and packed memories, departures, arrivals, road journeys and a life carried from one room to another.',
  scales: ['room', 'street', 'tabletop'],
});
