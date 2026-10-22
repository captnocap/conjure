import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Heavy punching bag',
  summary:
    'A leather heavy bag hung on a chain from a free-standing steel gallows frame, patched with duct tape and swaying from the last blow. Boxing gyms, garages, anger worked out alone, discipline, comebacks, a body kept honest.',
  scales: ['room', 'street', 'tabletop'],
});
