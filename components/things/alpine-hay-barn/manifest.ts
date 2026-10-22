import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Alpine hay barn',
  summary:
    'A small sun-blackened log barn raised on staddle stones, its shingle roof weighted with rocks and a scythe hung on the wall. Thrift, summers spent up high, old peasant craft, hay smell, a family that climbed here every July for three hundred years.',
  scales: ['street', 'landscape', 'tabletop'],
});
