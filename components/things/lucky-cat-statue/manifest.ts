import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Lucky cat statue',
  summary:
    'A ceramic maneki-neko with one raised paw that slowly beckons, a red collar, a gold bell and a coin held to its belly. Hope for customers, superstition, a shopkeeper\'s small prayer, kitsch good fortune on a till or towering by a shopfront.',
  scales: ['street', 'room', 'tabletop'],
});
