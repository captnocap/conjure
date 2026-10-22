import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Orbital tug drone',
  summary:
    'A stubby crewless space tug with grappling arms, thruster quads, a bumper plate and one big camera eye, hauling a load or waiting for one. A work animal: loyal, battered, blue-collar, the forklift or tow truck of orbit, a robot with a personality nobody designed.',
  scales: ['planetary', 'landscape', 'street', 'room', 'tabletop'],
});
