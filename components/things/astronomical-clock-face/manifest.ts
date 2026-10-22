import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Astronomical clock',
  summary:
    'A freestanding ornate town clock with nested dials, a drifting zodiac ring, a moon-phase globe and little doors where carved figures parade on the hour. Old market squares, fate and ritual, crowds waiting for noon, cosmic order made of brass, the hour that will not pass.',
  scales: ['street', 'room'],
});
