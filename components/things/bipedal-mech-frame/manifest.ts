import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bipedal mech frame',
  summary:
    'A two-storey walking war machine standing in its docking pose: cockpit hatch raised, joints and pistons exposed, unit number stencilled on the shoulder. Hangars before a sortie, pilots dwarfed by what they ride, model kits on a desk, old wars remembered by the ground crew.',
  scales: ['street', 'landscape', 'tabletop'],
});
