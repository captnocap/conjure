import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Safe-deposit box wall',
  summary:
    'A wall of numbered steel safe-deposit doors with twin keyholes, one long tin box pulled out and opened on a viewing shelf. Private things in a public vault: inheritance, secrets, a second life, what someone hid and what a stranger finds, heists and estates.',
  scales: ['room', 'tabletop'],
});
