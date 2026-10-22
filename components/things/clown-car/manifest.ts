import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Clown car',
  summary:
    'A tiny dented clown car with an oversized brass horn, mismatched wheels, a daisy on the bonnet and doors that do not fit, spilling shoes, scarves or smoke. Slapstick, too many passengers, cheerful chaos, a joke that has broken down, the sad clown after the laugh.',
  scales: ['street', 'room', 'tabletop'],
});
