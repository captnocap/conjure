import { defineThing, type ThingBuilder } from '@conjure/kit';

// The ear itself is modelled in the single ear-*.ts file beside this one.
const [ear] = Object.values(import.meta.glob<{ default: ThingBuilder }>('./ear-*.ts', { eager: true }));

export default defineThing(ear.default);
