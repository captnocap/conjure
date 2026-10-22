import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Barnacled ship wheel',
  summary:
    'A spoked wooden ship\'s helm with a brass hub on its steering pedestal, crusted with barnacles and weed. Command abandoned, the last order given, a wheel nobody is holding, wrecks and ghost ships, captains, steering a course or losing one.',
  scales: ['room', 'street', 'tabletop'],
});
