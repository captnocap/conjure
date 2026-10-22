import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Snowy owl on a perch',
  summary:
    'A white owl sitting on a frost-heaved hummock or a leaning survey stake, round head turned to stare at the viewer with yellow eyes. Watchfulness, Arctic silence, patience, a witness, the one thing in an empty land that is looking back.',
  scales: ['landscape', 'street', 'tabletop', 'room'],
});
