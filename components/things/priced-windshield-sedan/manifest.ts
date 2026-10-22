import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Priced windshield used car',
  summary:
    'A used sedan, coupe, hatchback or pickup on a sales lot with a shoe-polish price and slogan scrawled across the windshield, a sign on the roof and balloons tied to the mirror. First cars, easy credit, fast talk, hope and desperation, the thing you can almost afford.',
  scales: ['street', 'landscape', 'tabletop'],
});
