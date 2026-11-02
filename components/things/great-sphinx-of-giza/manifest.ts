import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Great Sphinx of Giza',
  summary:
    'The colossal limestone sphinx at Giza: a long recumbent lion with outstretched paws and a small human head in a striped nemes headdress, nose gone, beard broken, its body weathered into layered rock. Riddles, deep time, buried pharaohs, sand and tourists, the souvenir on a mantelpiece.',
  scales: ['landscape', 'street', 'tabletop'],
});
