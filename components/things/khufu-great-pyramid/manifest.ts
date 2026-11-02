import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Great Pyramid of Giza',
  summary:
    'The Great Pyramid of Khufu: 139 m of stepped yellow limestone courses on a 230 m square base, its summit broken flat with a survey mast, the entrance slot high on the north face; or new, sheathed in polished white casing under a gilded capstone. Pharaohs, eternity, desert horizons, the oldest wonder.',
  scales: ['landscape', 'planetary', 'street'],
});
