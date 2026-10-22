import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Balloon bouquet on ribbons',
  summary:
    'A cluster of foil and latex balloons on curling ribbons tied to a weight, a gift bag or a teddy, the big foil one printed with a message: get well soon, it\'s a boy, welcome home, congratulations. Some float bright, some sag toward the floor. Hospital bedsides, maternity wards, leaving dos, the day after a party, good wishes going slowly flat.',
  scales: ['room', 'tabletop', 'street'],
});
