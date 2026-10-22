import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Street musician',
  summary:
    'A busker playing to the street: a guitar, an accordion, a violin or a saxophone, standing or sitting on an amp, with an open case on the ground holding a few coins. Underpasses, metro entrances, markets, summer evenings, playing to nobody, a song you keep hearing, spare change and small kindnesses.',
  scales: ['street', 'room', 'tabletop'],
});
