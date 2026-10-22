import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Soviet pennant medallion',
  summary:
    'A pentagonal titanium pennant embossed with a hammer and sickle and CCCP lettering, the kind Soviet probes carried to the Moon and Venus: lying face up in alien dust, or kept in a velvet box in a drawer. Cold War pride, space-race heraldry, a medal for a machine, history in a pocket.',
  scales: ['planetary', 'street', 'room', 'tabletop'],
});
