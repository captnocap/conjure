import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Punch and Judy booth',
  summary:
    'A tall striped canvas seaside puppet booth with a little proscenium, a playboard and glove puppets: hook-nosed Punch with his slapstick, Judy, the crocodile and its sausages. Promenades and piers, wet British summers, children shrieking at cartoon violence, a professor hidden inside, an old show nobody has quite managed to cancel.',
  scales: ['street', 'room', 'tabletop'],
});
