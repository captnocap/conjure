import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Death mask display case',
  summary:
    'A slanted glass museum case of plaster death masks laid on dark cloth, eyes closed, each with a handwritten label. Mortality, fame and anonymity, the drowned unknown girl with her faint smile, medical museums, criminology collections, the last true likeness of a face.',
  scales: ['room', 'tabletop'],
});
