import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Dugout canoe',
  summary:
    'A slim hand-hewn log canoe, adze marks still showing, with a pole or paddle laid across it and whatever its owner left aboard. River and mangrove villages, quiet work, an absent owner, travel at walking pace, the oldest boat there is.',
  scales: ['street', 'room', 'landscape'],
});
