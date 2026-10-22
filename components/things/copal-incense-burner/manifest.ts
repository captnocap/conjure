import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Copal incense burner',
  summary:
    'A three-footed clay censer holding charcoal and glowing lumps of copal resin, a ribbon of smoke curling up from it. Ritual, cleansing a room, calling spirits, temples and home altars, the smell of something ancient being asked for.',
  scales: ['tabletop', 'room', 'macro', 'street'],
});
