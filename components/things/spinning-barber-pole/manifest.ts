import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Spinning barber pole',
  summary:
    'A barber pole with a striped helix climbing forever inside a glass cylinder between chrome caps, on a wall bracket, a pedestal, a kerbside post or a counter. The sign that a shop is open, a trade older than its street, main-street evenings, a neighbourhood landmark still turning or stopped behind cracked glass.',
  scales: ['street', 'room', 'tabletop'],
});
