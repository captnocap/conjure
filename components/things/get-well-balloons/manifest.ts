import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Get-well balloons',
  summary:
    'A cluster of foil and latex balloons on curling ribbons, tied to a weighted gift bag, a vase of flowers or a teddy bear. Messages from GET WELL SOON to IT’S A GIRL to THINKING OF YOU; fresh and taut on the day, or sagging to the floor a week later. Hospital visits, newborns, sympathy, love sent by people who could not stay.',
  scales: ['room', 'tabletop', 'street'],
});
