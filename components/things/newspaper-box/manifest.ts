import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Newspaper box',
  summary: 'A coin-operated street newspaper dispenser with a framed front page, the morning edition, empty streets and a story waiting to be read.',
  scales: ['street', 'room', 'tabletop'],
});
