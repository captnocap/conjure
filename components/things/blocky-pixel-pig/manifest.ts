import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Blocky pixel pig',
  summary:
    'A farm animal made of boxes with a painted pixel coat: a pig, cow, sheep, chicken or horse on four stub legs with a flat square snout, grazing or looking up, maybe saddled or on a lead, maybe with a baby beside it. Sandbox games, toy farms, children\'s rooms, a gentle companion creature for voxel landscapes.',
  scales: ['street', 'room', 'tabletop', 'landscape'],
});
