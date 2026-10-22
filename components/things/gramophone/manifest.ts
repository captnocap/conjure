import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Gramophone',
  summary: 'An antique acoustic gramophone with a flaring brass horn and mechanical winding handle, old recordings, parlour evenings and voices from another century.',
  scales: ['room', 'tabletop', 'street'],
});
