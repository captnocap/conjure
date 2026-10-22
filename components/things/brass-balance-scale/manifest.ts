import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Brass balance scale',
  summary:
    'A two-pan beam balance on a central column, with hanging brass pans and a set of small graded weights, standing level or tipped, bare or inside a glass case. Precision and trade, justice and fairness, an assayer weighing gold, a heart against a feather, a decision being weighed.',
  scales: ['tabletop', 'room', 'macro'],
});
