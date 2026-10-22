import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cashier cage window',
  summary:
    'A barred casino cashier cage with a marble sill, a pass-through tray, racks of chips and banded bills stacked behind the bars. Cashing out or buying back in, winnings and pawned watches, old banks, pay windows, money you can see but not touch.',
  scales: ['room', 'street', 'tabletop'],
});
