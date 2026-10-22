import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Waiting room chair row',
  summary:
    'A beam of four or five linked moulded seats on steel legs, with a low table of old magazines. A coat over a seat-back, a cold paper cup, a child’s toy, a blanket and bag where someone has kept vigil all night; hospitals, clinics and stations, hours spent not knowing, strangers sitting one seat apart.',
  scales: ['room', 'street', 'tabletop'],
});
