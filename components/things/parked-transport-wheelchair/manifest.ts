import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Parked transport wheelchair',
  summary:
    'A folding hospital wheelchair with a sling seat, swing-away footplates and a ward name stencilled across the backrest, parked empty by a door, folded against a wall or with a blanket on the seat. Discharge day, porters, corridors, a grandparent, the question of who was just sitting here and where they have gone.',
  scales: ['room', 'street', 'tabletop'],
});
