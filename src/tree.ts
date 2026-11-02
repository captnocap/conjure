import { CATALOGUE, entryOf } from '../engine/catalogue';
import type { Force, Plan } from '../engine/director';
import type { Ruling } from '../engine/settle';
import type { BuildReport } from '../engine/stage';
import { FRAMING_NAMES } from '../engine/framing';
import { PRESENTATION_NAMES } from '../engine/presentation';
import { ACCENT_NAMES } from '../engine/accent';
import { OTHERWORLD_NAMES, RIFTS } from '../engine/otherworld';
import { VACUI_FILLS, VACUI_NAMES } from '../engine/vacui';
import { PALETTE_NAMES } from '../engine/palette';
import { MATERIALIZE_NAMES } from '../engine/materialize';
import { MOTION_NAMES } from '../engine/motion';
import { HOUSE_NAMES } from '../engine/art-direction';

/**
 * The decision tree for one generation: every question that was asked, the answer taken,
 * and the answers that came close. Any other answer can be clicked to branch: it is pinned
 * and the scene is rebuilt with everything else decided as before.
 */
export interface TreeActions {
  /** Pin an answer ("<owner>::<question>"), or release it with undefined. */
  pin(key: string, value: string | number | boolean | undefined): void;
  reset(): void;
}

const STYLE = `
#tree { margin-top: 18px; border-top: 1px solid var(--ink); padding-top: 10px; }
#tree .tree-head { display: flex; gap: 10px; align-items: baseline; justify-content: space-between; flex-wrap: wrap; }
#tree .tree-head h2 { font: 20px Georgia, serif; margin: 0; }
#tree .tree-head p { margin: 0; font-size: 12px; color: var(--faint); flex: 1 1 180px; }
#tree .tree-head button { padding: 3px 9px; font-size: 12px; }
#tree ul { list-style: none; margin: 0; padding: 0 0 0 14px; border-left: 1px solid var(--rule); }
#tree > ul { padding-left: 0; border-left: 0; margin-top: 8px; }
#tree li { position: relative; padding: 5px 0 5px 12px; }
#tree li::before { content: ''; position: absolute; left: 0; top: 16px; width: 9px; border-top: 1px solid var(--rule); }
#tree > ul > li { padding-left: 0; }
#tree > ul > li::before { display: none; }
#tree summary { cursor: pointer; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; list-style: none; }
#tree summary::-webkit-details-marker { display: none; }
#tree summary::before { content: '▸'; color: var(--faint); font-size: 11px; width: 10px; }
#tree details[open] > summary::before { content: '▾'; }
#tree summary b { font: 17px Georgia, serif; }
#tree summary small, #tree .note { font-size: 12px; color: var(--faint); }
#tree .failed { color: #a3261c; }
#tree .ask { font-size: 12px; color: var(--faint); margin-bottom: 3px; }
#tree .answers { display: flex; flex-wrap: wrap; gap: 4px; }
#tree .answer { position: relative; border: 1px solid var(--rule); background: transparent; padding: 2px 8px; font-size: 12.5px; text-align: left; overflow: hidden; max-width: 100%; }
#tree .answer span { position: relative; overflow-wrap: anywhere; }
#tree .answer i { position: relative; font-style: normal; color: var(--faint); margin-left: 6px; font-size: 11px; }
#tree .answer::before { content: ''; position: absolute; inset: 0 auto 0 0; width: var(--p, 0%); background: var(--rule); opacity: 0.55; }
#tree .answer:hover { border-color: var(--ink); }
#tree .answer.taken { border-color: var(--ink); font-weight: 600; }
#tree .answer.taken::before { background: var(--ink); opacity: 0.16; }
#tree .answer.pinned { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
#tree .answer.pinned::after { content: ' pinned ✕'; position: relative; color: var(--accent); font-size: 11px; font-weight: 400; margin-left: 4px; }
#tree .answer.add { border-style: dashed; }
#tree .drop { border: 0; padding: 0 4px; font-size: 12px; color: var(--faint); text-decoration: underline; }
#tree.waiting { opacity: 0.55; pointer-events: none; }
`;

const titles = new Map(CATALOGUE.map((entry) => [entry.id, entry.title]));
const percent = (p: number) => `${Math.round(p * 100)}%`;
const readable = (label: string) => {
  const known = titles.get(label);
  if (known) return known;
  // Runtime things (traced pictures) are not in the static catalogue.
  for (const id of [label, `things/found-${label}`]) { try { return entryOf(id).title; } catch { /* not a known id */ } }
  return label.replace(/^(worlds|looks|things)\//, '').replace(/-/g, ' ');
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function host(): HTMLElement {
  let tree = document.querySelector<HTMLElement>('#tree');
  if (tree) return tree;
  document.head.append(Object.assign(document.createElement('style'), { textContent: STYLE }));
  tree = element('section');
  tree.id = 'tree';
  const sheet = document.querySelector<HTMLElement>('#sheet')!;
  sheet.before(tree);
  // The plain list stays available, folded away under the tree.
  sheet.hidden = true;
  return tree;
}

/** Remembers which branches a person has folded open, across rebuilds of the same idea. */
const opened = new Map<string, boolean>();

export function setTreeWaiting(waiting: boolean) {
  document.querySelector('#tree')?.classList.toggle('waiting', waiting);
}

export function renderTree(plan: Plan, reports: BuildReport[], lookNotes: string[], force: Force, actions: TreeActions) {
  const tree = host();
  tree.classList.remove('waiting');
  const pins = Object.keys(force).length;

  const head = element('div', undefined, 'tree-head');
  head.append(element('h2', 'Decision tree'), element('p', 'Each row is one decision. Click another answer to branch into it.'));
  if (pins) {
    const undo = element('button', `Release ${pins} pinned`);
    undo.type = 'button';
    undo.addEventListener('click', () => actions.reset());
    head.append(undo);
  }
  const list = element('button', 'List view');
  list.type = 'button';
  const sheet = document.querySelector<HTMLElement>('#sheet')!;
  list.setAttribute('aria-pressed', String(!sheet.hidden));
  list.addEventListener('click', () => {
    sheet.hidden = !sheet.hidden;
    list.setAttribute('aria-pressed', String(!sheet.hidden));
  });
  head.append(list);

  const answer = (label: string, p: number | null, state: 'taken' | 'other' | 'add', pinned: boolean, onClick: () => void, title?: string) => {
    const button = element('button', undefined, `answer ${state === 'taken' ? 'taken' : state === 'add' ? 'add' : ''}${pinned ? ' pinned' : ''}`);
    button.type = 'button';
    button.append(element('span', label));
    if (p !== null) {
      button.append(element('i', percent(p)));
      button.style.setProperty('--p', percent(p));
    }
    if (title) button.title = title;
    button.addEventListener('click', onClick);
    return button;
  };

  /** One decision: the question, the answer taken and the others that were on the table. */
  const decision = (ruling: Ruling) => {
    const key = `${ruling.owner}::${ruling.name}`;
    const item = element('li');
    item.dataset.decisionKey = key;
    item.append(element('div', ruling.ask, 'ask'));
    const answers = element('div', undefined, 'answers');
    const options = ruling.options?.length ? ruling.options : [{ label: ruling.picked, p: ruling.confidence }, ...ruling.alternatives];
    const shown = ruling.kind === 'score' ? options : [...options].sort((a, b) => Number(b.label === ruling.picked) - Number(a.label === ruling.picked));
    if (!shown.some((option) => option.label === ruling.picked)) shown.unshift({ label: ruling.picked, p: ruling.confidence });
    const known = shown.some((option) => option.p > 0);
    shown.forEach((option, index) => {
      const taken = option.label === ruling.picked;
      const value = ruling.kind === 'score' ? index / Math.max(1, shown.length - 1) : ruling.kind === 'noul' ? option.label === 'yes' : option.label;
      answers.append(
        answer(
          readable(option.label),
          known ? option.p : null,
          taken ? 'taken' : 'other',
          taken && !!ruling.forced,
          () => actions.pin(key, taken ? (ruling.forced ? undefined : value) : value),
          taken ? (ruling.forced ? 'Pinned by you. Click to release.' : 'The answer taken.') : 'Branch: rebuild the scene with this answer.',
        ),
      );
    });
    item.append(answers);
    if (ruling.note) item.append(element('div', ruling.note, 'note'));
    return item;
  };

  /** A foldable branch of the tree. */
  const branch = (id: string, title: string, note: string, children: HTMLElement[], open: boolean, extra?: HTMLElement) => {
    const item = element('li');
    const details = element('details');
    details.open = opened.get(id) ?? open;
    details.addEventListener('toggle', () => opened.set(id, details.open));
    const summary = element('summary');
    summary.append(element('b', title), element('small', note));
    if (extra) summary.append(extra);
    const inner = element('ul');
    inner.append(...children);
    details.append(summary, inner);
    item.append(details);
    return item;
  };

  const rulingsOf = (owner: string) => plan.rulings.filter((ruling) => ruling.owner === owner && !ruling.name.startsWith('cast:'));
  const built = (id: string) => {
    const report = reports.find((candidate) => candidate.id === id);
    return report ? (report.error ? `could not be built: ${report.error}` : `built in ${report.milliseconds} ms`) : '';
  };
  const direction = rulingsOf('direction');
  const style = direction.filter((ruling) => ruling.name === 'medium' || ruling.name === 'styleSpecified');
  const framing = direction.filter((ruling) => FRAMING_NAMES.includes(ruling.name));
  const presentation = direction.filter((ruling) => PRESENTATION_NAMES.includes(ruling.name));
  const accent = direction.filter((ruling) => ACCENT_NAMES.includes(ruling.name));
  const otherworld = direction.filter((ruling) => OTHERWORLD_NAMES.includes(ruling.name));
  const vacui = direction.filter((ruling) => VACUI_NAMES.includes(ruling.name));
  const palette = direction.filter((ruling) => PALETTE_NAMES.includes(ruling.name));
  const materialize = direction.filter((ruling) => MATERIALIZE_NAMES.includes(ruling.name));
  const motion = direction.filter((ruling) => MOTION_NAMES.includes(ruling.name));
  const house = direction.filter((ruling) => HOUSE_NAMES.includes(ruling.name));
  const mood = direction.filter((ruling) => !['world', 'look', 'medium', 'styleSpecified', ...FRAMING_NAMES, ...PRESENTATION_NAMES, ...ACCENT_NAMES, ...OTHERWORLD_NAMES, ...VACUI_NAMES, ...PALETTE_NAMES, ...MATERIALIZE_NAMES, ...MOTION_NAMES, ...HOUSE_NAMES].includes(ruling.name));
  const worldRuling = direction.find((ruling) => ruling.name === 'world');
  const lookRuling = direction.find((ruling) => ruling.name === 'look');
  const root = element('ul');

  if (house.length) root.append(branch('house', plan.direction?.entry.title ?? 'Direction', plan.direction ? `the direction the whole picture follows${plan.direction.finishes.length ? `, with ${plan.direction.finishes.join(' and ')}` : ''}` : 'no direction', house.map(decision), false));
  root.append(branch('direction', 'Mood', 'the mood every component reads', mood.map(decision), false));
  if (palette.length) root.append(branch('palette', 'Palette', plan.palette ? `the print\u2019s inks: ${plan.palette.ink} on ${plan.palette.ground}, with ${plan.palette.second}` : 'the print\u2019s inks', palette.map(decision), false));
  if (materialize.length) root.append(branch('materialize', 'Surfaces', plan.materialize ? `how far materials show through the medium: ${Math.round(plan.materialize.weight * 100)}%` : 'the medium flattens every surface', materialize.map(decision), false));
  if (framing.length) root.append(branch('framing', 'Framing', 'how the camera sees it', framing.map(decision), false));
  if (presentation.length) {
    const { kind, plates, index } = plan.presentation;
    const note = plates.length > 1 ? `${kind}: ${plates.length} plates, this one is ${plates[index].title}` : 'one plate';
    root.append(branch('presentation', 'Presentation', note, [...presentation, ...motion].map(decision), false));
  }

  root.append(
    branch('world', plan.world.entry.title, ['the setting', built(plan.world.entry.id)].filter(Boolean).join(' · '), [
      ...(worldRuling ? [decision(worldRuling)] : []),
      ...rulingsOf(plan.world.entry.id).map(decision),
    ], true),
  );

  const castPin = (id: string) => `direction::cast:${id}`;
  const members = plan.cast.map((member) => {
    const pinned = force[castPin(member.entry.id)] === true;
    const drop = element('button', pinned ? 'release' : 'leave out', 'drop');
    drop.type = 'button';
    drop.addEventListener('click', (event) => {
      event.preventDefault();
      actions.pin(castPin(member.entry.id), pinned ? undefined : false);
    });
    return branch(
      member.entry.id,
      member.entry.title,
      [pinned ? 'pinned by you' : `belongs ${percent(member.belongs)}`, built(member.entry.id)].filter(Boolean).join(' · '),
      rulingsOf(member.entry.id).map(decision),
      false,
      drop,
    );
  });
  const excluded = Object.entries(force).filter(([key, value]) => key.startsWith('direction::cast:') && value === false).map(([key]) => key.slice('direction::cast:'.length));
  if (plan.nearly?.length || excluded.length) {
    const item = element('li');
    item.append(element('div', 'Nearly cast. Click one to bring it into the scene.', 'ask'));
    const answers = element('div', undefined, 'answers');
    for (const id of excluded) answers.append(answer(`${readable(id)} (left out)`, null, 'add', true, () => actions.pin(castPin(id), undefined), 'Left out by you. Click to release.'));
    for (const near of plan.nearly ?? []) answers.append(answer(`+ ${near.title}`, near.belongs, 'add', false, () => actions.pin(castPin(near.id), true), 'Branch: cast this thing as well.'));
    item.append(answers);
    members.push(item);
  }
  root.append(branch('cast', 'Cast', `${plan.cast.length} thing${plan.cast.length === 1 ? '' : 's'}${plan.wanted ? ` for ${plan.wanted} place${plan.wanted === 1 ? '' : 's'}` : ''}`, members, true));

  if (plan.look) {
    if (style.length) root.append(branch('style', 'Art medium', 'the family of treatments', style.map(decision), true));
    const children = [...(lookRuling ? [decision(lookRuling)] : []), ...rulingsOf(plan.look.entry.id).map(decision)];
    if (lookNotes.length) {
      const note = element('li');
      note.append(element('div', lookNotes.join(', '), 'note'));
      children.unshift(note);
    }
    root.append(branch('look', plan.look.entry.title, 'the print', children, false));
  }

  if (accent.length) {
    const children = [...accent.map(decision), ...(plan.accent ? rulingsOf(plan.accent.look.entry.id).map(decision) : [])];
    root.append(branch('accent', 'Accent', plan.accent ? `${plan.accent.look.entry.title} over the ${plan.accent.region === 'detail' ? 'hero\u2019s detail' : 'hero'}` : 'one style throughout', children, false));
  }

  if (otherworld.length && plan.otherworld) {
    const rift = RIFTS[plan.otherworld.rift];
    root.append(branch('otherworld', 'Otherworld', rift.slice(0, rift.indexOf(':')).toLowerCase(), otherworld.map(decision), false));
  }

  if (vacui.length && plan.vacui) {
    const fill = VACUI_FILLS[plan.vacui.fill];
    root.append(branch('vacui', 'Dead space', fill.slice(0, fill.indexOf(':')).toLowerCase(), vacui.map(decision), false));
  }

  if (plan.design) {
    const children = rulingsOf('design').map(decision);
    const note = element('li');
    note.append(element('div', plan.design.notes.join(', '), 'note'));
    children.unshift(note);
    root.append(branch('design', 'Vector composition', `${plan.design.layers.length} automatically generated sheets`, children, false));
  }

  tree.replaceChildren(head, root);
}
