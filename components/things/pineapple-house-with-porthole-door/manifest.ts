import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pineapple house',
  summary:
    'A two-storey pineapple house with a round blue door, porthole windows, a leafy green crown and a stub chimney, standing on the sea floor. Sea-floor suburbia, Saturday-morning cartoons, silly optimism, a home that is also a fruit, the door you knock on when the episode starts.',
  scales: ['street', 'landscape', 'tabletop'],
});
