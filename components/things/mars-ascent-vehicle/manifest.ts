import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mars ascent vehicle',
  summary:
    'A stubby two-stage ascent rocket standing on a launch platform with fuel hoses, storage tanks and a ladder to its hatch: the only way home. Escape and rescue, the countdown everyone is waiting for, a ticket off the planet that might not work, or the scorched pad left after someone already took it.',
  scales: ['landscape', 'planetary', 'street'],
});
