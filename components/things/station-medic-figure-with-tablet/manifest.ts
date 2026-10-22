import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Station medic with a tablet',
  summary:
    'A medic in scrubs or a crew polo with a radio headset, standing or crouched at eye level with a tablet, a syringe, a blanket or a cup in one hand and the other reaching out to a shoulder. Sick bays, clinics, ambulances, ships far from home; bedside manner, bad news delivered gently, routine checks, someone who stayed late to make sure you were all right.',
  scales: ['room', 'street', 'tabletop'],
});
