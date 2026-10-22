import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Padded apartment door',
  summary:
    'A flat door in its frame, upholstered in buttoned leatherette against draughts and noise, with a peephole, a number plate, a doormat and shoes left outside. Neighbours heard but not seen, someone watching through the spyhole, coming home, a life summarised by what waits at the threshold.',
  scales: ['room', 'street', 'tabletop'],
});
