import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Slushie machine',
  summary:
    'A countertop frozen-drink machine with clear tanks of churning neon slush, pull taps and a drip tray. Gas-station summers, brain freeze, childhood pocket money, sugar at 2 a.m.',
  scales: ['room', 'tabletop'],
});
