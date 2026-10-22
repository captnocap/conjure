import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Shop cat on feed sacks',
  summary:
    'A stack of printed feed and seed sacks with the store cat asleep on top, tail flicking. Feed stores, barns, hardware shops and granaries; the real owner of the place, warm patches of sun, mousing duty, unhurried small-town afternoons.',
  scales: ['room', 'street', 'tabletop'],
});
