import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Scavenger handcart',
  summary:
    'A hand-pulled cart welded from a supermarket trolley and two bicycle wheels, lashed high with tarps, jerrycans, books and a potted plant. A whole life on two wheels: survivors, refugees, long walks on empty roads, the few things someone could not leave behind.',
  scales: ['street', 'room'],
});
