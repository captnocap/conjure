import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Sydney Harbour Bridge',
  summary:
    'The Sydney Harbour Bridge, the coat-hanger: a vast grey steel through-arch of lattice trusses springing between four granite pylons, the deck hung beneath it, flags on the summit. Depression-era pride, commuting, bridge climbs, New Year fireworks pouring off the deck, a city joined across its harbour.',
  scales: ['landscape', 'street'],
});
