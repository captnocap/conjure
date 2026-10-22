import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Filing cabinet',
  summary:
    'A dented steel filing cabinet with labelled drawers, one hanging open with manila folders fanned inside and things piled on top. Bureaucracy, secrets, records nobody reads, audits, detectives, back offices, a bottle hidden in the bottom drawer.',
  scales: ['room', 'street', 'tabletop'],
});
