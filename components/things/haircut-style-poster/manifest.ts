import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Haircut style poster',
  summary:
    'A framed, sun-faded barbershop wall chart of numbered haircuts: a grid of painted heads with flattops, fades, shags, mohawks or moustaches. Pointing and saying "number four", decades-old fashion, neighbourhood identity, choosing who to be, time standing still.',
  scales: ['room', 'tabletop'],
});
