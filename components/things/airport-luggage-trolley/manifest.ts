import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Airport luggage trolley',
  summary:
    "A nesting airport baggage trolley with a push-bar brake, empty, stacked with mismatched bags or carrying one taped cardboard box. Arrivals halls, emigration, everything you own on three wheels, luggage nobody came back for, the unattended item in the announcement.",
  scales: ['room', 'street', 'tabletop'],
});
