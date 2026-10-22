import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Newsstand',
  summary: 'An open newspaper kiosk crowded with headlines, postcards and magazines, a morning street corner, public life and stories bought for a journey.',
  scales: ['street', 'room', 'tabletop'],
});
