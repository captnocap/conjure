import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hanging spring scale',
  summary:
    'A market spring balance: a round dial hanging by a chain from a stall bracket, the needle trembling, a pan below with a red plastic bag of produce in it. Fairness and suspicion, haggling, thrift, a thumb on the scale, the small drama of a measured price.',
  scales: ['street', 'room', 'tabletop'],
});
