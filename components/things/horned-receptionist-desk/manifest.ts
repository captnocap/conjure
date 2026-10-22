import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Horned receptionist at a desk',
  summary:
    'A receptionist with small horns and a tail seated behind a laminate desk with a nameplate, a bell, a sign-in clipboard and a monitor, filing their nails or pointing you back to the ticket machine. Bureaucracy, demons with day jobs, front desks, deadpan comedy, the person who decides whether you get seen.',
  scales: ['room', 'street', 'tabletop'],
});
