import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Taj Mahal Palace hotel',
  summary:
    "Mumbai's 1903 Taj Mahal Palace facing the harbour: a long six-storey grey basalt and cream stone block of stacked arched verandahs, Gothic gables, corner towers with red onion domes and a great red-tiled central dome, the 1973 Tower slab behind. Old money and grand arrivals, wedding marigolds, monsoon on the domes, a city's pride and its wounds.",
  scales: ['landscape', 'street', 'tabletop'],
});
