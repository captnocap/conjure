import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Gear fountain',
  summary:
    'A public fountain whose tiers are slowly meshing cogwheels, with an upright scoop wheel lifting water, oil or sand from the basin to the top. Town squares, civic pride in machinery, wishes thrown as coins, things that must keep turning, a city seizing up.',
  scales: ['street', 'landscape'],
});
