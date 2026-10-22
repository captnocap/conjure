import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Crashed escape pod',
  summary:
    'A small spherical escape pod half-buried at the end of the furrow it ploughed, hatch blown, parachute snagged in tall fronds. Survival stories, castaways, the first hour on a strange world or a wreck found long afterwards: who got out, and where did the footprints go?',
  scales: ['street', 'landscape', 'planetary', 'tabletop'],
});
