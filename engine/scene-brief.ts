import { MAX_BRIEF_CHARACTERS } from './decision-limits';

/** The parts of a scene a component is told about when its own questions are asked. */
export interface SceneSoFar {
  world: { id: string; title: string };
  cast: readonly { id: string; title: string }[];
  look: { id: string; title: string } | null;
}

/**
 * A component's questions are judged with the rest of the scene in view: a chair asked
 * in a flooded temple answers differently from a chair asked alone. The line is cut to the
 * brief limit by dropping the furthest companions first.
 */
export function sceneBrief(base: string, subject: { id: string; title: string }, scene: SceneSoFar): string {
  const lead = `${base} These questions shape one part of the scene: ${subject.title}.`;
  const others = scene.cast.filter((member) => member.id !== subject.id).map((member) => member.title);
  const compose = (count: number) => {
    const parts = [lead];
    if (subject.id !== scene.world.id) parts.push(`The setting is ${scene.world.title}.`);
    const named = others.slice(0, count);
    if (named.length) parts.push(`Also in the scene: ${named.join(', ')}${others.length > count ? ' and more' : ''}.`);
    if (scene.look && subject.id !== scene.look.id) parts.push(`It will be printed as ${scene.look.title}.`);
    return parts.join(' ');
  };
  for (let count = others.length; count >= 0; count--) {
    const brief = compose(count);
    if (brief.length <= MAX_BRIEF_CHARACTERS) return brief;
  }
  return lead.slice(0, MAX_BRIEF_CHARACTERS);
}
