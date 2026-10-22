import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Motel sign',
  summary: 'A roadside motel sign with a glowing vacancy panel, arrow and rates, desert highways, late arrivals and a temporary home far away.',
  scales: ['street', 'landscape', 'room', 'tabletop'],
});
