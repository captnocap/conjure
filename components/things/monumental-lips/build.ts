import { defineThing, type ThingBuilder } from '@conjure/kit';

// The mouth itself is modelled in the single lips-*.ts file beside this one.
const [lips] = Object.values(import.meta.glob<{ default: ThingBuilder }>('./lips-*.ts', { eager: true }));

export default defineThing(lips.default);
