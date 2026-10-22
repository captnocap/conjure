import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Roman caldarium',
  summary:
    'The hot room of a Roman public bath seen from one corner: a barrel-vaulted hall with a sunken pool, steam, marble benches and a shaft of light from a high round window. Gleams as an imperial afternoon full of gossip, or stands cracked and drained with weeds in the mosaic. Leisure, bodies, empire, luxury and its decay.',
  scales: ['room', 'street'],
});
