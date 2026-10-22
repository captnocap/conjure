import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tethered cryobot',
  summary:
    'A torpedo-shaped under-ice submersible with lamps and a sampling arm, hanging on its umbilical over a hole in the ice or lying on a sled awaiting launch. Deep exploration, a lifeline into the dark, first contact by robot, whatever it brought back up with it.',
  scales: ['street', 'landscape', 'planetary', 'room', 'tabletop'],
});
