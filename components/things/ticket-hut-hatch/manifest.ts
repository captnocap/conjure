import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ticket hut',
  summary:
    'A tiny painted timber ticket hut with a sliding hatch, a roll of paper tickets, a hand-painted price board and a string of coloured bulbs along the eave. Crazy golf, piers, fairgrounds and car parks; out-of-season resorts, back-in-five-minutes signs, summer jobs, small prizes promised in big letters.',
  scales: ['street', 'room', 'tabletop'],
});
