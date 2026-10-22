import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Nurses’ station desk',
  summary:
    'A curved, high-fronted ward counter with glowing monitors, racks of colour-tabbed charts, a desk phone, a tin of biscuits and a whiteboard of bed numbers behind it. The one lit place on a hospital ward at night: busy, deserted or mid-handover; night shift, vigilance, tired kindness, the place you go to ask.',
  scales: ['room', 'street'],
});
