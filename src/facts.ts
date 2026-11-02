import { CATALOGUE, entryOf } from '../engine/catalogue';
import { MEDIUM_WORDS } from '../engine/styles';
import type { LookMedium } from '../kit/contract';
import type { GalleryEntry } from './dock';

/**
 * The column beside the picture: the idea as its title, and under it the decisions in the same
 * rows the live feed draws. A picture from the gallery has no feed, so its rows are rebuilt from
 * the record saved with it.
 */
const titleOf = (id: string | undefined | null) => {
  if (!id) return '';
  try { return entryOf(id).title; } catch { return id.replace(/^(worlds|looks|things|directions)\//, '').replace(/-/g, ' '); }
};
const mediumWords = (lookId: string) => {
  const medium = (CATALOGUE.find((entry) => entry.id === lookId) as { medium?: LookMedium } | undefined)?.medium;
  return medium ? MEDIUM_WORDS[medium] : '';
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** The idea, large, with a line of what it became above it. */
export function renderTitle(host: HTMLElement, idea: string, eyebrow: string) {
  host.replaceChildren(element('p', eyebrow, 'eyebrow'), element('h1', idea, 'idea-title'));
}

export function eyebrowOf(lookId: string | null | undefined, scale: string | undefined, kind: string | undefined) {
  return [lookId && titleOf(lookId), scale, kind && kind !== 'plate' ? kind : ''].filter(Boolean).join(' · ');
}

const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/** The decision rows of a saved picture, drawn like the live feed's settled rows. */
export function renderEntryRows(host: HTMLElement, entry: GalleryEntry) {
  const list = element('ol');
  const row = (title: string, detail: string, items?: string[]) => {
    if (!detail && !items?.length) return;
    const node = element('li', undefined, 'row settled');
    const slot = element('span', undefined, 'detail');
    slot.append(element('span', detail));
    if (items?.length) {
      const held = element('span', undefined, 'items');
      items.forEach((item, index) => {
        const chip = element('span', item, 'item');
        chip.style.animationDelay = `${Math.min(index, 12) * 60}ms`;
        held.append(chip);
      });
      slot.append(held);
    }
    node.append(element('span', undefined, 'mark'), element('span', title, 'title'), slot);
    node.style.animationDelay = `${list.children.length * 50}ms`;
    list.append(node);
  };
  row('Direction', titleOf(entry.direction?.id));
  if (entry.look) row('Look', [titleOf(entry.look.id), mediumWords(entry.look.id)].filter(Boolean).join(', '), entry.look.notes);
  row('World', [titleOf(entry.world?.id), entry.scale].filter(Boolean).join(', '));
  row('Cast', '', (entry.cast ?? []).map((member) => titleOf(member.id)));
  row('Presentation', entry.presentation?.kind === 'plate' ? 'one plate' : entry.presentation?.kind ?? '', entry.presentation && entry.presentation.kind !== 'plate' ? entry.presentation.plates : undefined);
  row('Vector sheets', '', [...new Set((entry.design?.layers ?? []).map((layer) => layer.motif))]);
  row('Made', [when(entry.savedAt), entry.model ? entry.model.split('/').pop() : entry.source === 'model' ? '' : entry.source === 'study' ? 'a free study' : entry.source === 'offline' ? 'offline' : ''].filter(Boolean).join(' · '));
  host.replaceChildren(list);
}
