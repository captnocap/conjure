import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Figure sitting on a crate',
  summary:
    'A person sitting on an upturned crate, a milk crate, an oil drum or a sandbag: upright with a bowl or a book, slumped with elbows on knees, or crouched beside it. Loading docks, markets, backstage, roadside breaks, eating alone, the pause that lasts too long, waiting for the lift home.',
  scales: ['street', 'room', 'tabletop'],
});
