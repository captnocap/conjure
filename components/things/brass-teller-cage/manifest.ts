import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Brass teller cage',
  summary:
    'A bank teller window: a marble counter under an ornate brass grille with a small arched pass-through, a nameplate and a green-shaded lamp. Old money, polite distance, waiting your turn, payday, institutions that keep a barrier between you and what is yours.',
  scales: ['room', 'street', 'tabletop'],
});
