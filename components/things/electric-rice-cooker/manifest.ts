import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Electric rice cooker',
  summary:
    'A round floral-printed electric rice cooker with a hinged lid, a steam vent, a glowing keep-warm lamp and a rice paddle in its side holder. Asian kitchens everywhere, the appliance that means someone is home, mothers and grandmothers, steam at dinner time, student flats, comfort.',
  scales: ['tabletop', 'room', 'macro'],
});
