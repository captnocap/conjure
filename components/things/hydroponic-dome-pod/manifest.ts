import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hydroponic dome pod',
  summary:
    'A clear geodesic dome on a drum-shaped pod, full of green leaf racks under grow lights, with a radiator fin. Life carried into the dark: a garden on a moon or a station, fresh food far from Earth, care, homesickness, or a greenhouse left to run wild.',
  scales: ['planetary', 'landscape', 'street', 'room', 'tabletop'],
});
