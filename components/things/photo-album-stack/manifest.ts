import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Photo album stack',
  summary:
    'A stack of padded photograph albums with the top one lying open to corner-mounted snapshots, beside a shoebox of loose prints. Family memory, attics and clear-outs, faces nobody can name any more, the gap on the page where someone used to be.',
  scales: ['room', 'tabletop'],
});
