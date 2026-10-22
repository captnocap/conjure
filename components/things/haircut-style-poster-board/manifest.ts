import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Haircut style poster board',
  summary:
    'A sun-faded barbershop chart of numbered haircut portraits, each a simply painted head: fades, pompadours, afros, perms or hand-lettered West African cuts, on a wall, a pavement A-frame or a propped plywood board. Pointing and saying "give me number seven", who you wanted to be that year, street-corner signwriting, fashion frozen in the window for decades.',
  scales: ['room', 'street', 'tabletop'],
});
