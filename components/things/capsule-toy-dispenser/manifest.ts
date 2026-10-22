import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Capsule toy dispenser',
  summary:
    'A double-stacked gachapon machine: clear tanks of coloured capsules, a coin slot, a crank and faded prize cards. Small hopes for one coin outside an arcade or noodle bar; childhood luck, collecting, pocket change, the one prize you never get.',
  scales: ['street', 'room'],
});
