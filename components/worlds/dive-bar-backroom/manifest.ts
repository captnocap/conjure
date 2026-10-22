import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Dive bar back room',
  summary:
    'A narrow, long-established neighbourhood dive bar near closing time, cut away: a scarred wooden bar with a brass foot rail, a mirrored back bar, a strip of tin ceiling, panelling stapled with dollar bills and photographs, and a worn patch of floor. Regulars, last call, breakups and reunions, cheap pitchers, the same song again, comfort in a place that never changes.',
  scales: ['room', 'street'],
});
