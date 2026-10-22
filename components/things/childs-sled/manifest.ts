import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Child’s sled',
  summary:
    'A small child’s sled, wooden with curled runners or aluminium with coloured slats, with a tow rope, leaned upright against a wall still dripping meltwater, or dusty from years unused. Winter childhoods, being pulled home through snow, things stored on landings, children grown up and gone.',
  scales: ['room', 'street', 'tabletop'],
});
