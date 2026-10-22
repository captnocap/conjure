import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Dog driving a car',
  summary:
    'A small hatchback, pickup, convertible or taxi with a dog at the steering wheel, paws on the wheel, head out of the open window with its tongue out, sometimes in sunglasses or a bandana, sometimes with a human in the passenger seat. Absurd joy, pet owners, road trips, drive-thrus, the internet’s favourite lie.',
  scales: ['street', 'room', 'tabletop'],
});
