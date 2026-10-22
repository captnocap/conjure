import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Surgical lamp on an arm',
  summary:
    'A multi-bulb operating light on a jointed arm, blazing straight down, dimmed, or with one bulb dead. Operating theatres, dentists, autopsies and interrogations: scrutiny, exposure, nowhere to hide, the hard white light people wake up under or never do.',
  scales: ['room', 'street', 'tabletop'],
});
