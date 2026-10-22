import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Parking pay station',
  summary:
    'A chunky pay-on-foot car park kiosk with a glowing screen, coin slot, card reader and a receipt curling out of its mouth. Fumbling for change, lost tickets, small bureaucratic dread, being the last one here before the drive home.',
  scales: ['street', 'room', 'tabletop'],
});
