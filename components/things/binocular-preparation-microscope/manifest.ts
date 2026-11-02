import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Binocular preparation microscope',
  summary: 'A low magnification stereo microscope with paired eyepieces, a broad working stage and an adjustable arm. Fossil preparation, tiny repairs, close attention and the patient work of looking.',
  scales: ['tabletop', 'room', 'macro'],
});
