import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Stranded Mars rover',
  summary:
    'A six-wheeled science rover with a camera mast and a dusty solar deck, one wheel dug into soft sand at the end of its last tracks. A beloved robot at the end of its mission: loyalty, loneliness, a final message home, machines that outlive their purpose, quiet on a red planet.',
  scales: ['landscape', 'planetary', 'street', 'tabletop'],
});
