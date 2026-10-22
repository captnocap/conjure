import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Slumped night sysadmin',
  summary:
    'A person sitting on the floor with their back against a server cabinet, a laptop open on their knees, a lanyard round their neck and a coffee cup beside them: typing, staring, or asleep with the lid shut. Night shifts, outages at 3 a.m., on-call, the one human who keeps the machine running.',
  scales: ['room', 'street', 'tabletop'],
});
