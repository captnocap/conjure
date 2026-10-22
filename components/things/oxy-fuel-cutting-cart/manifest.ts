import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Oxy-fuel cutting cart',
  summary:
    'A two-wheeled cart carrying an oxygen cylinder and a gas bottle, coiled twin hoses and a cutting torch with a small hard flame, goggles hung on the handle. Scrapyards, shipbreaking, welding shops, dangerous work done in sandals, the tool that turns a ship into plates.',
  scales: ['street', 'room', 'tabletop'],
});
