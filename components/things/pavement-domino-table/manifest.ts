import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pavement domino table',
  summary:
    'A small table set out on the pavement with a domino game in progress, four mismatched chairs, rum glasses and an ashtray. Old friends and old arguments, the slam of a winning tile, long warm evenings, a neighbourhood that lives outdoors, retirement and ritual.',
  scales: ['street', 'room', 'tabletop'],
});
