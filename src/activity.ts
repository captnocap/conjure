import { entryOf } from '../engine/catalogue';
import { onActivity } from '../engine/activity';

/**
 * The live feed under the prompt while an idea is conjured: one row per decision, drawn in as the
 * studio reaches it. A row pulses while its questions are out with the model and settles into the
 * answer in words; the cast lists its things one by one; the build and the print report as they
 * happen. A hairline above the feed creeps along as the stages pass, and a footer counts the
 * questions, requests and seconds, so a long batch never looks like a hang.
 */
export interface ActivityFeed {
  /** The idea is finished: stop the clock and settle the feed. */
  finish(): void;
  /** The idea failed: mark what was still being asked. */
  fail(): void;
}

/** What each consultation asks, in the feed's words, and the row it belongs to. */
const ABOUT: Record<string, { key: string; title: string; asking: string }> = {
  direction: { key: 'direction', title: 'Direction', asking: 'which direction the whole picture follows' },
  scene: { key: 'scene', title: 'Scene', asking: 'the mood, the framing, the setting' },
  medium: { key: 'look', title: 'Look', asking: 'which art medium' },
  look: { key: 'look', title: 'Look', asking: 'which treatment within that medium' },
  casting: { key: 'casting', title: 'Cast', asking: 'every thing at this scale, whether it belongs' },
  shortlist: { key: 'casting', title: 'Cast', asking: 'the closest ones again, with the setting in view' },
  relations: { key: 'relations', title: 'Relations', asking: 'where each thing stands beside the hero' },
  composition: { key: 'composition', title: 'Vector sheets', asking: 'motifs, inks, placement' },
};

/** How far along the hairline each stage carries the idea. */
const PROGRESS: Record<string, number> = {
  direction: 0.06, scene: 0.16, palette: 0.165, materialize: 0.167, framing: 0.17, presentation: 0.18, world: 0.2, look: 0.3, casting: 0.48, relations: 0.54,
  composition: 0.62, build: 0.88, print: 0.96, portrait: 0.98, plates: 0.98, loop: 0.98, saved: 1, window: 1,
};
/** Each component's own questions carry the line from here to there. */
const DETAILS_FROM = 0.62;
const DETAILS_TO = 0.82;

const titleOf = (id: string) => {
  try { return entryOf(id).title; } catch { return id.replace(/^(worlds|looks|things|directions)\//, '').replace(/-/g, ' '); }
};
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function installActivity(host: HTMLElement): ActivityFeed {
  const list = host.querySelector('ol')!;
  const foot = host.querySelector<HTMLElement>('.activity-foot')!;
  const rows = new Map<string, HTMLLIElement>();
  let questions = 0;
  let requests = 0;
  let started = 0;
  let clock: number | null = null;
  let reached = 0;
  let detailsAsked = 0;
  let detailsDone = 0;

  const progress = (to: number) => {
    reached = Math.max(reached, Math.min(1, to));
    host.style.setProperty('--progress', `${Math.round(reached * 100)}%`);
  };
  const tick = () => {
    const elapsed = started ? (performance.now() - started) / 1000 : 0;
    foot.replaceChildren(
      element('span', `${elapsed.toFixed(elapsed < 10 ? 1 : 0)} s`),
      element('span', plural(questions, 'question')),
      element('span', plural(requests, 'request')),
    );
  };

  const row = (key: string, title: string) => {
    let node = rows.get(key);
    if (!node) {
      node = element('li', undefined, 'row');
      node.dataset.key = key;
      node.append(element('span', undefined, 'mark'), element('span', title, 'title'), element('span', undefined, 'detail'));
      list.append(node);
      rows.set(key, node);
      node.scrollIntoView?.({ block: 'nearest' });
    } else node.querySelector('.title')!.textContent = title;
    return node;
  };

  const show = (key: string, title: string, detail: string, state: 'asking' | 'settled' | 'failed', items?: readonly { text: string; note?: string; failed?: boolean }[]) => {
    const node = row(key, title);
    node.classList.remove('asking', 'settled', 'failed');
    node.classList.add(state);
    const slot = node.querySelector<HTMLElement>('.detail')!;
    slot.replaceChildren(element('span', detail));
    if (state === 'asking') slot.append(element('span', undefined, 'dots'));
    if (items?.length) {
      const held = element('span', undefined, 'items');
      items.forEach((item, index) => {
        const chip = element('span', item.text, `item${item.failed ? ' failed' : ''}`);
        chip.style.animationDelay = `${Math.min(index, 12) * 70}ms`;
        if (item.note) chip.append(element('small', item.note));
        held.append(chip);
      });
      slot.append(held);
    }
  };
  /** The build row lists each component as it lands. */
  const built: { text: string; note?: string; failed?: boolean }[] = [];

  const reset = () => {
    list.replaceChildren();
    rows.clear();
    foot.replaceChildren();
    questions = requests = reached = detailsAsked = detailsDone = 0;
    built.length = 0;
    host.style.setProperty('--progress', '0%');
    host.classList.remove('done', 'failed');
    started = performance.now();
    if (clock !== null) clearInterval(clock);
    clock = window.setInterval(tick, 200);
    tick();
  };
  const stop = () => {
    if (clock !== null) clearInterval(clock);
    clock = null;
    tick();
  };

  onActivity((activity) => {
    switch (activity.type) {
      case 'begin':
        reset();
        break;
      case 'asking': {
        const detail = activity.about.startsWith('detail:') ? null : ABOUT[activity.about];
        const count = `${plural(activity.questions, 'question')}${activity.batches > 1 ? `, batch ${activity.batch} of ${activity.batches}` : ''}`;
        if (detail) show(detail.key, detail.title, `${detail.asking} · ${count}`, 'asking');
        else if (activity.about.startsWith('detail:')) {
          if (activity.batch === 1) detailsAsked++;
          show(activity.about, titleOf(activity.about.slice('detail:'.length)), `its own questions · ${count}`, 'asking');
        }
        break;
      }
      case 'answered':
        questions += activity.questions;
        requests++;
        tick();
        break;
      case 'decided': {
        const key = activity.stage;
        if (key.startsWith('detail:')) {
          detailsDone++;
          progress(DETAILS_FROM + (DETAILS_TO - DETAILS_FROM) * (detailsDone / Math.max(detailsAsked, detailsDone)));
        } else progress(PROGRESS[key] ?? reached);
        show(key, activity.title, activity.detail, 'settled', activity.items?.map((text) => ({ text })));
        break;
      }
      case 'step':
        if (activity.done) progress(PROGRESS[activity.stage] ?? reached);
        if (activity.stage === 'build' && !activity.done) built.length = 0;
        show(activity.stage, activity.title, activity.detail, activity.done ? 'settled' : 'asking', activity.stage === 'build' ? built : undefined);
        break;
      case 'built': {
        // Later mounts (the plates of a series, the scene behind a portrait) build the same things again; the row keeps the first build.
        const node = rows.get('build');
        if (!node || !node.classList.contains('asking')) break;
        built.push({ text: activity.title, note: activity.error ? 'failed' : `${activity.milliseconds} ms`, failed: !!activity.error });
        show('build', node.querySelector('.title')!.textContent ?? 'Build', node.querySelector('.detail > span')!.textContent ?? '', 'asking', built);
        break;
      }
    }
  });

  return {
    finish() {
      progress(1);
      for (const node of rows.values()) if (node.classList.contains('asking')) { node.classList.remove('asking'); node.classList.add('settled'); node.querySelector('.dots')?.remove(); }
      host.classList.add('done');
      stop();
    },
    fail() {
      for (const node of rows.values()) if (node.classList.contains('asking')) { node.classList.remove('asking'); node.classList.add('failed'); node.querySelector('.dots')?.remove(); }
      host.classList.add('done', 'failed');
      stop();
    },
  };
}
