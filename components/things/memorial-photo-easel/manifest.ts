import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Memorial photo easel',
  summary:
    'A wooden easel holding a framed portrait or a collage board of snapshots, a ribbon across one corner and a candle burning below. Funerals, wakes, memorial services, retirement dos and anniversaries: one life summed up in the picture the family chose, the face everybody keeps glancing at.',
  scales: ['room', 'street', 'tabletop'],
});
