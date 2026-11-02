import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Checker cab',
  summary:
    'A Checker Marathon, the boxy yellow New York taxi of 1960 to 1982: upright cabin, flat roof, round headlights, chrome bumpers, a checkerboard band and a roof light. Hailing a cab in the rain, Taxi Driver nights, 1970s Manhattan, jump seats, the city on the meter.',
  scales: ['street', 'room', 'tabletop'],
});
