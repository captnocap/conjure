import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wet bar cart',
  summary:
    'A brass and smoked-glass rolling bar cart loaded with cut-glass decanters, an ice bucket, a soda siphon and mismatched tumblers. Cocktail hour, hospitality and showing off, or the quieter story of someone pouring one more alone.',
  scales: ['room', 'street', 'tabletop'],
});
