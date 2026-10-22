import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Quarried stone block',
  summary:
    'A freshly cut block of stone the size of a van, fluted with drill holes, daubed with a lot number and resting on wooden chocks. Quarries, raw material, sculpture before it is sculpture, patience, weight, a piece of mountain with a destination painted on it.',
  scales: ['landscape', 'street', 'tabletop'],
});
