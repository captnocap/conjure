import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Film restoration workshop',
  summary: 'A film archive workroom with rewind benches, light tables, hanging leader and shelving full of cans. Analogue cinema, patient repair, recovered home movies and the physical memory of lost screenings.',
  scales: ['room', 'tabletop'],
});
