import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Scarlet ibis',
  summary:
    'A vivid red wading bird with a long down-curved bill, standing on one leg, probing the mud or lifting off on black-tipped wings. Mangrove swamps and tropical estuaries, a flare of colour in green gloom, grace, dusk roosting, something rare seen for a moment.',
  scales: ['tabletop', 'street', 'room', 'landscape'],
});
