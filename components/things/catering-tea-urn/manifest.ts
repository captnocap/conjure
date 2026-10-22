import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Catering tea urn',
  summary:
    'A steel hot-water urn with a tap and sight glass on a small table beside ranks of cups and saucers, a sugar bowl and a milk jug, steam drifting off the lid. Church halls, committee meetings, funeral teas, blood-donor sessions, jumble sales: the comfort of being handed something warm by someone who does not ask how you are.',
  scales: ['room', 'street', 'tabletop'],
});
