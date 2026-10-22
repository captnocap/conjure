import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Vet clinic exam room',
  summary:
    'A small modern veterinary exam room: a stainless lift table under an exam lamp, a counter with jars of treats and swabs, a floor scale, an anatomy poster, a plastic chair for the owner and a door with a narrow window. Fluorescent calm, worry held politely, tenderness, disinfectant, a first puppy visit or the last goodbye, busy clinic or after-hours quiet.',
  scales: ['room', 'tabletop', 'street'],
});
