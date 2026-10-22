import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Glass jewellery counter',
  summary:
    'A waist-high glass display counter with velvet pads of watches, chains and rings under a strip light. Pawn shops, jewellers, flea-market stalls, bargaining over a loupe, heirlooms priced by weight, things that were loved and let go.',
  scales: ['room', 'street', 'tabletop'],
});
