import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Okada motorbike taxi',
  summary:
    'A small commercial motorcycle taxi with a thick padded pillion seat, mirrors, a helmet hooked on the handlebar and whatever it has been asked to carry roped on behind. Shortcuts, risk, squeezing through gridlock, West African streets, getting through when nothing else moves.',
  scales: ['street', 'tabletop'],
});
