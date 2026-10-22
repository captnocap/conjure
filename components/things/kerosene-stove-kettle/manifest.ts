import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Kerosene stove with kettle',
  summary:
    'A cylindrical Japanese kerosene heater with a glowing mesh burner behind a wire guard and a kettle steaming on its top plate, or rice cakes toasting there. Winter classrooms and living rooms, the smell of paraffin, drowsy warmth, childhood, damp mittens drying, a grandmother minding the kettle.',
  scales: ['room', 'tabletop', 'street'],
});
