import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Neighbour with the whiskey tray',
  summary:
    'A man in shirtsleeves with a loosened tie, or an apron, carrying a tin tray of whiskey and small glasses, cups of tea, bottles of stout or a cake at chest height, mid-step or stopped to offer it. Wakes, weddings, pubs, parish halls, parties and kitchens; hospitality as a way of coping, the one job a neighbour can do, keeping busy so as not to cry.',
  scales: ['room', 'street', 'tabletop'],
});
