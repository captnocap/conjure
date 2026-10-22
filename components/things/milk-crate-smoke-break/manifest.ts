import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Milk crate smoke break',
  summary:
    'An upturned milk crate by a restaurant back door with a coffee-tin ashtray, a folded apron and a phone or paperback left on it. Five minutes of rest in a double shift: alley air, aching feet, a cigarette, a call home, the place where cooks become people again.',
  scales: ['street', 'room', 'tabletop'],
});
