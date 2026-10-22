import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mini-golf windmill',
  summary:
    'A child-height fibreglass windmill obstacle on a strip of green felt, its sails sweeping across a ball tunnel in the base. Crazy golf on a seafront, family rivalry, first dates, summer holidays, cheerful shabbiness and the one hole everybody remembers.',
  scales: ['street', 'room', 'tabletop'],
});
