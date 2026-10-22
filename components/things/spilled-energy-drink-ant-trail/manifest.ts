import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Spilled energy drink with ant trail',
  summary:
    'A tall energy drink can knocked on its side in a sticky dark puddle, with a line of ants leading from the puddle away across the floor, maybe a crumbled snack bar in it and a sticky-note apology or paper towel nearby. Carelessness, infestation, desks and dorm floors, the small disaster that explains the big one.',
  scales: ['room', 'tabletop', 'macro'],
});
