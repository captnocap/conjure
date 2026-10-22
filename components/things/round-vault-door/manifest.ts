import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Round vault door',
  summary:
    'A massive circular steel bank vault door standing ajar in its wall: spoked wheel, ring of bolts, glass-cased time lock, and whatever waits inside. Security and its failure, heists, secrets kept, fortunes, bunkers, the moment after the lock gives.',
  scales: ['room', 'street', 'tabletop'],
});
