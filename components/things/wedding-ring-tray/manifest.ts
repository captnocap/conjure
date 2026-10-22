import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wedding ring tray',
  summary:
    'A velvet jeweller\'s tray of second-hand rings standing in slotted rows, each with a tiny handwritten ticket. Pawn counters, estate sales, divorce and widowhood, hard months: every slot a small surrendered promise, and one of them empty.',
  scales: ['tabletop', 'room', 'macro'],
});
