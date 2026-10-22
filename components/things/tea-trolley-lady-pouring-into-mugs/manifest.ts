import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tea trolley lady',
  summary:
    'A woman in a tabard and headscarf behind a two-tier steel trolley with a big tea urn, a stack of white mugs, a plate of biscuits and a milk jug, one hand on the urn tap pouring into a held mug. The tea break personified: factories, hospitals, offices, building sites, ten minutes of mercy in the middle of a shift.',
  scales: ['room', 'street', 'tabletop'],
});
