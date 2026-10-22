import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wedding top table',
  summary:
    'The long linen-draped head table of a wedding breakfast: a run of flowers and candles, place cards, glasses, favour boxes and a row of banquet chairs facing the room. Speeches, toasts, family politics, who sits beside whom, an absent guest, the wreckage of a feast at midnight.',
  scales: ['room', 'street', 'tabletop'],
});
