import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Flashing stoplight span',
  summary:
    'A single four-way traffic signal hung on a sagging cable between two leaning wooden poles, blinking red or amber over an empty crossroads. The only light in town, 3 a.m. with nobody coming, one-stoplight places, waiting for no reason, wind on the plains.',
  scales: ['street', 'landscape', 'tabletop'],
});
