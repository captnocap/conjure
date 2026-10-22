import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Chemistry classroom',
  summary:
    'A school science lab seen from the back of the room: rows of fixed benches with gas taps and sinks, tall windows down one side, a demonstration bench and blackboard at the front, glass cupboards of reagent bottles. First experiments, boredom and wonder, detention, the smell of gas, the last day of term or an empty school in summer.',
  scales: ['room', 'tabletop'],
});
