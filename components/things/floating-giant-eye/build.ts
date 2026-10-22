import { defineThing, type ThingBuilder } from '@conjure/kit';

// The eye itself is modelled in the single eye-*.ts file beside this one.
const [eye] = Object.values(import.meta.glob<{ default: ThingBuilder }>('./eye-*.ts', { eager: true }));

export default defineThing(eye.default);
