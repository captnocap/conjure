import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Night bus driver in the cab',
  summary:
    'A bus driver seated behind a wide flat wheel inside a glazed cab with a ticket machine, a cash tray and a wide mirror, both hands on the wheel, head turned to check the mirror. Night buses, the last run of the shift, the only sober adult for miles, routes driven ten thousand times, a thermos on the dash, a green glow from the ticket machine.',
  scales: ['room', 'street', 'tabletop'],
});
