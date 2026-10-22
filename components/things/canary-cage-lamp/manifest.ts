import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Canary cage lamp',
  summary:
    "A miner's safety lantern with a tiny clockwork canary in a wire cage above the flame, hung on a hook. Old pit superstition carried somewhere it no longer makes sense: warnings, bad air, luck, keeping watch underground, a small warm light and a bird that may have stopped singing.",
  scales: ['street', 'room', 'tabletop', 'landscape', 'planetary'],
});
