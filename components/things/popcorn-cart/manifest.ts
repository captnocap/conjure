import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Popcorn cart',
  summary:
    'A red wheeled popcorn wagon with a glass popping case, striped awning, kettle, scoop and stacked striped boxes, selling popcorn, candy floss, roasted nuts or toffee apples. Fairs, circuses, cinema lobbies, parks and street corners; butter and burnt sugar on the air, pocket money, a treat before the show.',
  scales: ['street', 'room', 'tabletop'],
});
