import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ring-footed Venus lander',
  summary:
    'A Venera-style lander: a dented spherical pressure vessel on a toroidal landing ring, a saucer aerobrake and antenna drum above, a camera port open to the ground. Soviet 1970s probes, two hours of life at 460 degrees, shabby heroism, doomed machines that worked anyway.',
  scales: ['planetary', 'landscape', 'street', 'tabletop'],
});
