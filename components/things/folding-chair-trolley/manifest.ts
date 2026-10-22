import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Folding chair trolley',
  summary:
    'A low wheeled trolley stacked with folded hall chairs, a few set out nearby in a loose ring. Church halls, school assemblies, support groups, polling stations, the hour before or after any gathering: someone has to put the chairs out, and someone always stays behind to stack them.',
  scales: ['room', 'street'],
});
