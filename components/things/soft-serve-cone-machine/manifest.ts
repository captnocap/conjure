import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Soft-serve machine',
  summary:
    'A stainless soft-serve ice cream machine with two pull levers and a twist nozzle, a tube of cones beside it, a cone being swirled out or a drip hardening on the tray, sometimes wearing a hand-written BROKEN sign. Summers, boardwalks, fast-food counters, kids on tiptoe, the machine that is always broken.',
  scales: ['room', 'street', 'tabletop'],
});
