import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Brass orrery',
  summary:
    'A clockwork model of planets riding brass arms around a glowing sun globe, slowly turning on a geared pedestal. Wizards, astronomers, natural philosophy, patient obsession, a cosmos small enough to wind up, the unease of counting the planets and finding one gone.',
  scales: ['tabletop', 'room', 'street'],
});
