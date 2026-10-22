import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Epicycle gear planet',
  summary:
    'A brass deferent arm with gear teeth carrying a small loop on which a painted planet rides, so it makes the old retrograde wiggle as it turns; a desk orrery part or a piece of the sky machine. Ptolemy, astronomers and clockmakers, patient wrong answers, the beauty of a theory kept alive by adding wheels.',
  scales: ['cosmic', 'planetary', 'tabletop', 'room'],
});
