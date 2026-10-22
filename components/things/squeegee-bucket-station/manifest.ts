import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Squeegee bucket station',
  summary:
    'A pump-island service post: a bin of murky blue washer fluid with a long-handled squeegee standing in it, a paper-towel dispenser above, a trash can below and a little card sign on top. Bug-splattered windshields, the two-minute ritual of a fuel stop, road trips, what travellers throw away.',
  scales: ['street', 'room', 'tabletop'],
});
