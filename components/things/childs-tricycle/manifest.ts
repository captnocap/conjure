import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Child's tricycle",
  summary:
    'A small metal tricycle with handlebar streamers, a sprung saddle and a step plate, parked or tipped over where it was dropped. Early childhood, pavements and driveways, being called indoors, something outgrown and left out in the rain.',
  scales: ['street', 'tabletop', 'room'],
});
