import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Back bar bottle shelf',
  summary:
    'A mirrored, stepped back-bar shelf of liquor bottles with a brass cash register, a tip jar and a string of year-round Christmas lights. The altar of a neighbourhood bar: bartenders, regulars remembered on the wall, cheap whiskey, cash only, a place that never changes.',
  scales: ['room', 'street', 'tabletop'],
});
