import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: 'Sailmaker long-arm sewing machine',
  summary: 'An industrial long-arm sewing machine sunk into a broad cloth-support table, with a treadle motor, tall thread cones and a heavy sail passing under its needle. Sail lofts, canvas repair and long patient seams.',
  scales: ['room', 'street', 'tabletop'],
});
