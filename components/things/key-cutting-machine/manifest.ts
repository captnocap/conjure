import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Key cutting machine',
  summary:
    'A bench key duplicator with twin vises and a cutter wheel, in front of a wall board hung with rows of brass blanks. Hardware stores, locksmith kiosks, new flats and break-ups, spare keys for someone trusted, the shriek of brass and the smell of hot filings.',
  scales: ['room', 'tabletop', 'street'],
});
