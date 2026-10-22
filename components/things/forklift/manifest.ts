import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Forklift',
  summary:
    'A counterbalance forklift truck with a mast, forks, overhead guard, amber beacon and a propane bottle or battery pack. Warehouses, loading docks, builders merchants, early shifts, heavy lifting, reversing beeps, a job somebody has just stepped away from.',
  scales: ['street', 'room', 'tabletop'],
});
