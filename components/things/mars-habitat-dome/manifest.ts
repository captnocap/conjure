import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mars habitat dome',
  summary:
    'A regolith-covered dome habitat on a dusty plain, with an airlock tube, a porthole, a rooftop antenna and sandbags heaped at its base. Stubborn homesteading on a dead world, cabin fever, a single lit window in the dust, pulp space-colony dreams and the long wait for resupply.',
  scales: ['landscape', 'planetary', 'street'],
});
