import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Elder reading at a folding rehal',
  summary:
    'An old man with a white beard and a prayer cap sitting cross-legged on a small patterned rug, a large open book on a folding X-shaped wooden stand before him, one finger on the line, reading glasses, perhaps a glass of tea beside him. Mosques, madrasas, libraries, front rooms and verandas; patience, long study, quiet devotion, a grandfather who has read the same pages for sixty years.',
  scales: ['room', 'street', 'tabletop'],
});
