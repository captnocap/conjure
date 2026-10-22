import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Baby monitor',
  summary:
    'A handheld baby monitor on its charging base, stub antenna up, a row of sound-level lights pulsing green to red. Listening from another room, anxiety made into a device, new-parent vigilance, a quiet evening that could end at any second, static and breathing.',
  scales: ['tabletop', 'room', 'macro'],
});
