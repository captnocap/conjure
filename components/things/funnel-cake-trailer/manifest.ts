import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Funnel cake trailer',
  summary:
    'A boxy fair concession trailer with a propped-up serving flap, a giant painted menu, fryer steam and paper plates dusted with powdered sugar. County fairs, fried dough, sticky fingers, summer jobs, the smell that reaches the parking lot.',
  scales: ['street', 'room', 'tabletop'],
});
