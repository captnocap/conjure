import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Izakaya paper lantern',
  summary:
    'A big red chochin paper lantern with brushed kanji, hung from a bracket, post or beam, glowing from within and swaying a little. Welcome after work, cheap drinks, yakitori smoke, a door still open late on a side street.',
  scales: ['street', 'room'],
});
