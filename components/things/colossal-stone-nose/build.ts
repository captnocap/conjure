import { defineThing, type ThingBuilder } from '@conjure/kit';

// The nose itself is carved in the single nose-*.ts file beside this one.
const [nose] = Object.values(import.meta.glob<{ default: ThingBuilder }>('./nose-*.ts', { eager: true }));

export default defineThing(nose.default);
