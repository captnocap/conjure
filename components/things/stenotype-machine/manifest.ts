import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Stenotype machine',
  summary:
    "A court reporter's stenotype on a tripod with a small stool and a ribbon of paper tape folding into a pool beneath it. The silent record of everything said, verbatim memory, depositions and hearings, the one person in the room who may not react.",
  scales: ['room', 'tabletop'],
});
