import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Floor pizza picnic',
  summary:
    'A takeaway pizza box open on the bare floor with paper plates, bottles and a tealight, an upturned crate standing in for a table. The first night in a new place or the last in an old one, celebration without furniture, friends who helped carry, being broke and happy.',
  scales: ['room', 'tabletop', 'street'],
});
