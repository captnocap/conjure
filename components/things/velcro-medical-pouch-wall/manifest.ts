import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Medical pouch wall',
  summary:
    'A station wall panel of velcro-strapped medical pouches, labelled drawers, an orange defibrillator and a stowed oxygen bottle, a few pouches hanging open with tubing and wrappers. Sick bays, ambulances, ships, field clinics; being cared for far from home, emergencies at 3 a.m., the quiet hum after one, everything in its place or nothing.',
  scales: ['room', 'tabletop', 'street'],
});
