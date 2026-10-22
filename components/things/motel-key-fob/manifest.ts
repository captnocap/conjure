import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Motel key and fob',
  summary:
    'A brass room key on a ring with an oversized bright plastic fob stamped with the room number and "drop in any mailbox, we guarantee postage", lying on a surface or hanging on a hook board. Checking in, a secret address, an alibi, a souvenir you were not meant to keep.',
  scales: ['tabletop', 'macro', 'room'],
});
