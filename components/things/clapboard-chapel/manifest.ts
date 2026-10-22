import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Country chapel',
  summary:
    'A small one-room church with a steeple, double doors and tall arched windows: white clapboard, carpenter gothic, adobe mission, cinder block or a converted storefront. Sunday mornings, weddings and homegoings, choir practice glowing at dusk, rural faith, a congregation that dwindled until the doors were boarded.',
  scales: ['street', 'landscape', 'tabletop'],
});
