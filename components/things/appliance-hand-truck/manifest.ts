import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Appliance hand truck',
  summary:
    'A two-wheeled steel sack truck with a ratchet strap and a scuffed toe plate, loaded with boxes, a fridge or a washing machine, or standing empty. Moving day labour, rented vans, sore backs, favours owed to friends, deliveries, the last heavy thing down the stairs.',
  scales: ['room', 'street'],
});
