import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Storage unit door',
  summary:
    'One bay of a self-storage row: a ribbed roll-up door with a stencilled unit number and a hasp, shut, half-raised on darkness or open on whatever was kept. Lives in boxes, divorce and downsizing, estates, hidden hobbies, secrets, somewhere to put what cannot be thrown away.',
  scales: ['street', 'room', 'tabletop'],
});
