import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Empire State Building',
  summary:
    'The 1931 Art Deco skyscraper of Midtown Manhattan: a limestone shaft striped with steel mullions, stepping up through setbacks to a floodlit mooring mast and needle antenna, 443 m tall. New York as a promise, King Kong, first dates on the 86th floor, ambition, the Depression-era city reaching up.',
  scales: ['landscape', 'street', 'planetary', 'tabletop'],
});
